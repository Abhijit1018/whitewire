import { describe, expect, it } from "vitest";
import { buildArchitectPrompt, parseArchitectResponse } from "@/core/ai/architect";

describe("buildArchitectPrompt", () => {
  it("embeds the board and asks for JSON", () => {
    const p = buildArchitectPrompt("Nodes:\n- Login (feature)");
    expect(p).toContain("Login (feature)");
    expect(p.toLowerCase()).toContain("json");
  });
});

describe("parseArchitectResponse", () => {
  it("parses a valid JSON response", () => {
    const raw = JSON.stringify({
      missing: ["Auth", "Payments"],
      suggestions: [{ title: "User table", kind: "entity", type: "table" }],
      improvements: ["Add caching"],
    });
    const r = parseArchitectResponse(raw);
    expect(r.missing).toEqual(["Auth", "Payments"]);
    // The type decides which canvas node the suggestion becomes when added.
    expect(r.suggestions).toEqual([{ title: "User table", kind: "entity", type: "table" }]);
    expect(r.improvements).toEqual(["Add caching"]);
  });

  it("parses JSON embedded in prose / fences", () => {
    const raw = 'Sure!\n```json\n{"missing":["X"],"suggestions":[],"improvements":[]}\n```';
    expect(parseArchitectResponse(raw).missing).toEqual(["X"]);
  });

  it("defaults suggestion kind and type, and drops empty titles", () => {
    const raw = '{"suggestions":[{"title":"API"},{"title":""},{"kind":"idea"}]}';
    expect(parseArchitectResponse(raw).suggestions).toEqual([
      { title: "API", kind: "idea", type: "concept" },
    ]);
  });

  it("falls back to concept for a node type the canvas cannot render", () => {
    const raw = '{"suggestions":[{"title":"X","type":"hologram"}]}';
    expect(parseArchitectResponse(raw).suggestions[0].type).toBe("concept");
  });

  it("returns empty result for unparseable input", () => {
    expect(parseArchitectResponse("no json here")).toEqual({
      missing: [],
      suggestions: [],
      improvements: [],
    });
  });
});
