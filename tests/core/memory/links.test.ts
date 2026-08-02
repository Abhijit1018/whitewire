import { describe, it, expect } from "vitest";
import {
  extractLinks,
  buildMemoryGraph,
  backlinksFor,
  normalizeTitle,
} from "@/core/memory/links";

const note = (id: string, title: string, body = "") => ({ id, title, body });

describe("extractLinks", () => {
  it("pulls wiki links out of a body", () => {
    expect(extractLinks("See [[Pricing]] and [[Roadmap]].")).toEqual(["Pricing", "Roadmap"]);
  });

  it("takes the target of an aliased link, not the label", () => {
    expect(extractLinks("[[Pricing|what we charge]]")).toEqual(["Pricing"]);
  });

  it("collapses duplicates but keeps the first spelling", () => {
    expect(extractLinks("[[Pricing]] then [[pricing]] again")).toEqual(["Pricing"]);
  });

  it("ignores empty and malformed links", () => {
    expect(extractLinks("[[]] [[ ]] [not a link] [[unclosed")).toEqual([]);
  });

  it("returns nothing for a body with no links", () => {
    expect(extractLinks("plain text")).toEqual([]);
  });
});

describe("normalizeTitle", () => {
  it("ignores case and collapses whitespace", () => {
    expect(normalizeTitle("  Go   To Market ")).toBe("go to market");
  });
});

describe("buildMemoryGraph", () => {
  it("links two notes that reference each other by title", () => {
    const graph = buildMemoryGraph([
      note("a", "Pricing", "See [[Roadmap]]"),
      note("b", "Roadmap", ""),
    ]);
    expect(graph.links).toEqual([{ from: "a", to: "b" }]);
  });

  it("matches titles case-insensitively", () => {
    const graph = buildMemoryGraph([note("a", "A", "[[road MAP]]"), note("b", "Road Map", "")]);
    expect(graph.links).toEqual([{ from: "a", to: "b" }]);
  });

  it("keeps a link to a note that does not exist yet, as a placeholder", () => {
    const graph = buildMemoryGraph([note("a", "Pricing", "[[Not Written Yet]]")]);
    const placeholder = graph.nodes.find((n) => !n.exists);
    expect(placeholder?.title).toBe("Not Written Yet");
    expect(graph.links).toEqual([{ from: "a", to: placeholder!.id }]);
  });

  it("reuses one placeholder when several notes link to the same missing title", () => {
    const graph = buildMemoryGraph([
      note("a", "A", "[[Ghost]]"),
      note("b", "B", "[[ghost]]"),
    ]);
    expect(graph.nodes.filter((n) => !n.exists)).toHaveLength(1);
    expect(graph.links).toHaveLength(2);
  });

  it("drops a note linking to itself", () => {
    expect(buildMemoryGraph([note("a", "Pricing", "[[Pricing]]")]).links).toEqual([]);
  });

  it("lists every real note as a node", () => {
    const graph = buildMemoryGraph([note("a", "A"), note("b", "B")]);
    expect(graph.nodes.filter((n) => n.exists).map((n) => n.title)).toEqual(["A", "B"]);
  });

  it("handles an empty set", () => {
    expect(buildMemoryGraph([])).toEqual({ nodes: [], links: [] });
  });
});

describe("backlinksFor", () => {
  it("finds the notes pointing at a note", () => {
    const graph = buildMemoryGraph([
      note("a", "A", "[[Target]]"),
      note("b", "B", "[[Target]]"),
      note("t", "Target", ""),
    ]);
    expect(backlinksFor("t", graph).sort()).toEqual(["a", "b"]);
  });

  it("returns nothing for a note nobody links to", () => {
    expect(backlinksFor("t", buildMemoryGraph([note("t", "Target")]))).toEqual([]);
  });
});
