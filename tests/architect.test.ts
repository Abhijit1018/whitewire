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
      suggestions: [{ title: "User table", kind: "entity" }],
      improvements: ["Add caching"],
    });
    const r = parseArchitectResponse(raw);
    expect(r.missing).toEqual(["Auth", "Payments"]);
    expect(r.suggestions).toEqual([{ title: "User table", kind: "entity" }]);
    expect(r.improvements).toEqual(["Add caching"]);
  });

  it("parses JSON embedded in prose / fences", () => {
    const raw = 'Sure!\n```json\n{"missing":["X"],"suggestions":[],"improvements":[]}\n```';
    expect(parseArchitectResponse(raw).missing).toEqual(["X"]);
  });

  it("defaults suggestion kind and drops empty titles", () => {
    const raw = '{"suggestions":[{"title":"API"},{"title":""},{"kind":"idea"}]}';
    expect(parseArchitectResponse(raw).suggestions).toEqual([{ title: "API", kind: "idea" }]);
  });

  it("returns empty result for unparseable input", () => {
    expect(parseArchitectResponse("no json here")).toEqual({
      missing: [],
      suggestions: [],
      improvements: [],
    });
  });
});
