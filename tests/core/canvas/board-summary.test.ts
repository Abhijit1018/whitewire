import { describe, it, expect } from "vitest";
import { summarizeBoard } from "@/core/canvas/board-summary";

const node = (id: string, type: string, text: string, data = {}) => ({
  id,
  type,
  data: { text, ...data },
});

describe("summarizeBoard", () => {
  it("returns nothing for an empty board", () => {
    expect(summarizeBoard([])).toEqual({ text: "", handles: {} });
  });

  it("gives every node a handle mapped back to its real id", () => {
    const summary = summarizeBoard([node("uuid-a", "aiNode", "Login"), node("uuid-b", "tableNode", "users")]);
    expect(summary.handles).toEqual({ "#1": "uuid-a", "#2": "uuid-b" });
  });

  it("names each node by its scene type, not its renderer", () => {
    const summary = summarizeBoard([node("a", "tableNode", "users"), node("b", "codeNode", "slugify")]);
    expect(summary.text).toContain('#1 table "users"');
    expect(summary.text).toContain('#2 code "slugify"');
  });

  it("includes column names so the model can extend a schema", () => {
    const summary = summarizeBoard([
      node("a", "tableNode", "users", { table: { columns: [{ name: "id", type: "uuid" }, { name: "email", type: "text" }] } }),
    ]);
    expect(summary.text).toContain("columns: id, email");
  });

  it("mentions the device of a wireframe", () => {
    const summary = summarizeBoard([
      node("a", "wireframeNode", "Checkout", { wireframe: { title: "Checkout", device: "mobile" } }),
    ]);
    expect(summary.text).toContain("mobile wireframe");
  });

  it("skips pen strokes, which are ink rather than structure", () => {
    const summary = summarizeBoard([node("a", "drawNode", ""), node("b", "aiNode", "Real")]);
    expect(summary.handles).toEqual({ "#1": "b" });
  });

  it("lists connections between nodes it showed", () => {
    const summary = summarizeBoard(
      [node("a", "aiNode", "A"), node("b", "aiNode", "B")],
      [{ source: "a", target: "b", label: "reads" }],
    );
    expect(summary.text).toContain("#1 -> #2 (reads)");
  });

  it("drops an edge pointing at a node it did not show", () => {
    const summary = summarizeBoard([node("a", "aiNode", "A")], [{ source: "a", target: "ghost" }]);
    expect(summary.text).not.toContain("->");
  });

  it("caps how many nodes it lists and says how many were left out", () => {
    const many = Array.from({ length: 45 }, (_, i) => node(`n${i}`, "aiNode", `N${i}`));
    const summary = summarizeBoard(many, [], 40);
    expect(Object.keys(summary.handles)).toHaveLength(40);
    expect(summary.text).toContain("5 more not listed");
  });

  it("falls back to untitled rather than an empty quote", () => {
    expect(summarizeBoard([node("a", "aiNode", "  ")]).text).toContain('"untitled"');
  });
});
