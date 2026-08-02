import { describe, it, expect } from "vitest";
import { harvestNotes, describeHarvest } from "@/core/memory/harvest";

const n = (id: string, type: string, text: string, purpose = "") => ({
  id,
  type,
  data: { text, purpose },
});

const project = (
  projectId: string,
  projectName: string,
  nodes: ReturnType<typeof n>[],
  edges: { source: string; target: string }[] = [],
) => ({ projectId, projectName, nodes, edges });

describe("harvestNotes", () => {
  it("turns board entities into notes without any user action", () => {
    const notes = harvestNotes([
      project("p1", "Blog", [n("a", "tableNode", "posts", "articles"), n("b", "aiNode", "Slug helper")]),
    ]);
    expect(notes.map((x) => x.title).sort()).toEqual(["Slug helper", "posts"]);
  });

  it("merges an entity that appears on several boards into one note", () => {
    const notes = harvestNotes([
      project("p1", "Blog", [n("a", "tableNode", "users")]),
      project("p2", "Shop", [n("b", "tableNode", "Users")]),
    ]);
    expect(notes).toHaveLength(1);
    expect(notes[0].projects.map((p) => p.name)).toEqual(["Blog", "Shop"]);
  });

  it("keeps the fullest description found across boards", () => {
    const notes = harvestNotes([
      project("p1", "A", [n("a", "tableNode", "users", "short")]),
      project("p2", "B", [n("b", "tableNode", "users", "a much longer description")]),
    ]);
    expect(notes[0].body).toBe("a much longer description");
  });

  it("records links from the board's own edges, by title", () => {
    const notes = harvestNotes([
      project(
        "p1",
        "Blog",
        [n("a", "aiNode", "API"), n("b", "tableNode", "posts")],
        [{ source: "a", target: "b" }],
      ),
    ]);
    expect(notes.find((x) => x.title === "API")?.links).toEqual(["posts"]);
  });

  it("ignores pen strokes, notes and shapes, which are not entities", () => {
    const notes = harvestNotes([
      project("p1", "A", [n("d", "drawNode", "x"), n("s", "shapeNode", "Decision?"), n("t", "noteNode", "todo")]),
    ]);
    expect(notes).toEqual([]);
  });

  it("drops generic titles that would pollute a pooled graph", () => {
    const notes = harvestNotes([
      project("p1", "A", [n("a", "aiNode", "New idea"), n("b", "aiNode", "Untitled"), n("c", "aiNode", "Real Thing")]),
    ]);
    expect(notes.map((x) => x.title)).toEqual(["Real Thing"]);
  });

  it("drops titles too short to mean anything", () => {
    expect(harvestNotes([project("p1", "A", [n("a", "aiNode", "ab")])])).toEqual([]);
  });

  it("does not link an entity to itself across duplicate nodes", () => {
    const notes = harvestNotes([
      project("p1", "A", [n("a", "aiNode", "Same"), n("b", "aiNode", "same")], [{ source: "a", target: "b" }]),
    ]);
    expect(notes[0].links).toEqual([]);
  });

  it("does not repeat a link already recorded", () => {
    const notes = harvestNotes([
      project(
        "p1",
        "A",
        [n("a", "aiNode", "API"), n("b", "tableNode", "posts")],
        [{ source: "a", target: "b" }, { source: "a", target: "b" }],
      ),
    ]);
    expect(notes.find((x) => x.title === "API")?.links).toEqual(["posts"]);
  });

  it("handles an account with no projects", () => {
    expect(harvestNotes([])).toEqual([]);
  });
});

describe("describeHarvest", () => {
  it("shows the description, its links and where it was seen", () => {
    const [note] = harvestNotes([
      project(
        "p1",
        "Blog",
        [n("a", "aiNode", "API", "the surface"), n("b", "tableNode", "posts")],
        [{ source: "a", target: "b" }],
      ),
    ]);
    const text = describeHarvest(note);
    expect(text).toContain("the surface");
    expect(text).toContain("[[posts]]");
    expect(text).toContain("Seen in: Blog");
  });
});
