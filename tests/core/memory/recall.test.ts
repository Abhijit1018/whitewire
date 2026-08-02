import { describe, it, expect } from "vitest";
import { scoreNote, selectRelevant, renderRecall } from "@/core/memory/recall";

const note = (title: string, body = "") => ({ id: title, title, body });

describe("scoreNote", () => {
  it("weights a title match above a body match", () => {
    const wanted = new Set(["pricing"]);
    expect(scoreNote(note("Pricing"), wanted)).toBeGreaterThan(
      scoreNote(note("Other", "pricing"), wanted),
    );
  });

  it("scores zero when nothing matches", () => {
    expect(scoreNote(note("Roadmap"), new Set(["billing"]))).toBe(0);
  });
});

describe("selectRelevant", () => {
  const notes = [note("Pricing", "We charge in rupees"), note("Roadmap", "ship the canvas")];

  it("returns the note that matches the request", () => {
    expect(selectRelevant(notes, "add a pricing page").map((n) => n.title)).toEqual(["Pricing"]);
  });

  it("returns nothing when no note is relevant", () => {
    expect(selectRelevant(notes, "unrelated zebra")).toEqual([]);
  });

  it("ignores a request made only of common words", () => {
    expect(selectRelevant(notes, "make a board for the")).toEqual([]);
  });

  it("caps how many notes ride along in the prompt", () => {
    const many = Array.from({ length: 12 }, (_, i) => note(`Pricing ${i}`, "pricing"));
    expect(selectRelevant(many, "pricing", 5)).toHaveLength(5);
  });

  it("puts the strongest match first", () => {
    const picked = selectRelevant(
      [note("Something", "pricing"), note("Pricing", "")],
      "pricing",
    );
    expect(picked[0].title).toBe("Pricing");
  });
});

describe("renderRecall", () => {
  it("renders one line per note", () => {
    expect(renderRecall([note("Pricing", "in rupees")])).toBe("- Pricing: in rupees");
  });

  it("truncates a long body so it cannot flood the prompt", () => {
    const rendered = renderRecall([note("A", "x".repeat(900))], 100);
    expect(rendered.length).toBeLessThan(140);
  });

  it("collapses newlines so each note stays on its own line", () => {
    expect(renderRecall([note("A", "one\ntwo")])).toBe("- A: one two");
  });
});
