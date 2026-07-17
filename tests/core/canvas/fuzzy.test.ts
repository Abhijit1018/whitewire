import { describe, expect, it } from "vitest";
import { fuzzyScore, fuzzyFilter } from "@/core/canvas/fuzzy";

describe("fuzzyScore", () => {
  it("returns 0 for an empty query", () => {
    expect(fuzzyScore("anything", "")).toBe(0);
  });

  it("matches a subsequence", () => {
    expect(fuzzyScore("align left", "aln")).not.toBeNull();
  });

  it("returns null when chars are out of order or missing", () => {
    expect(fuzzyScore("align left", "zzz")).toBeNull();
    expect(fuzzyScore("align left", "tfel")).toBeNull(); // reversed
  });

  it("scores a contiguous prefix better (lower) than a gappy match", () => {
    const prefix = fuzzyScore("align left", "ali")!;
    const gappy = fuzzyScore("axlxix", "ali")!;
    expect(prefix).toBeLessThan(gappy);
  });

  it("is case-insensitive", () => {
    expect(fuzzyScore("Align Left", "align")).not.toBeNull();
  });
});

describe("fuzzyFilter", () => {
  const items = ["Align left", "Align right", "Add note", "Delete selected", "Export PNG"];

  it("keeps only matches, ranked best-first", () => {
    const r = fuzzyFilter(items, "align", (s) => s);
    expect(r).toEqual(["Align left", "Align right"]);
  });

  it("returns everything for an empty query in original order", () => {
    expect(fuzzyFilter(items, "", (s) => s)).toEqual(items);
  });

  it("ranks a tighter match above a gappy one", () => {
    const r = fuzzyFilter(["Add note", "Align left"], "al", (s) => s);
    expect(r[0]).toBe("Align left"); // "al" is a prefix of Align
  });
});
