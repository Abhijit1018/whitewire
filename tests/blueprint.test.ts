import { describe, expect, it } from "vitest";
import { buildBlueprintPrompt, parseBlueprint } from "@/core/ai/blueprint";

describe("buildBlueprintPrompt", () => {
  it("embeds the request and asks for JSON nodes/edges", () => {
    const p = buildBlueprintPrompt("Food delivery app");
    expect(p).toContain("Food delivery app");
    expect(p.toLowerCase()).toContain("json");
    expect(p).toContain('"nodes"');
  });
});

describe("parseBlueprint", () => {
  it("parses nodes and edges", () => {
    const raw = JSON.stringify({
      nodes: [
        { title: "Orders", kind: "feature", note: "order lifecycle" },
        { title: "Payments", kind: "component", note: "" },
      ],
      edges: [[0, 1]],
    });
    const bp = parseBlueprint(raw);
    expect(bp.nodes).toHaveLength(2);
    expect(bp.nodes[0]).toEqual({ title: "Orders", kind: "feature", note: "order lifecycle" });
    expect(bp.edges).toEqual([[0, 1]]);
  });

  it("parses JSON in fences and drops out-of-range / self edges", () => {
    const raw = '```json\n{"nodes":[{"title":"A"}],"edges":[[0,0],[0,5]]}\n```';
    const bp = parseBlueprint(raw);
    expect(bp.nodes).toEqual([{ title: "A", kind: "idea", note: "" }]);
    expect(bp.edges).toEqual([]);
  });

  it("drops nodes without a title", () => {
    expect(parseBlueprint('{"nodes":[{"title":""},{"title":"B"}]}').nodes).toEqual([
      { title: "B", kind: "idea", note: "" },
    ]);
  });

  it("returns empty for unparseable input", () => {
    expect(parseBlueprint("nope")).toEqual({ nodes: [], edges: [] });
  });
});
