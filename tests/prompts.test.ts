import { describe, expect, it } from "vitest";
import { buildExpandPrompt, parseExpandResponse } from "@/core/ai/prompts";

describe("buildExpandPrompt", () => {
  it("includes the concept text and asks for a JSON array", () => {
    const p = buildExpandPrompt("Login Page");
    expect(p).toContain("Login Page");
    expect(p.toLowerCase()).toContain("json");
  });
});

describe("parseExpandResponse", () => {
  it("parses a bare JSON array", () => {
    expect(parseExpandResponse('["Email", "Password", "OAuth"]')).toEqual(["Email", "Password", "OAuth"]);
  });
  it("parses a fenced ```json block", () => {
    const raw = "Sure!\n```json\n[\"A\", \"B\"]\n```\nDone";
    expect(parseExpandResponse(raw)).toEqual(["A", "B"]);
  });
  it("falls back to splitting bullet/numbered lines", () => {
    const raw = "- Email\n- Password\n3. Forgot password";
    expect(parseExpandResponse(raw)).toEqual(["Email", "Password", "Forgot password"]);
  });
  it("trims and drops empty entries", () => {
    expect(parseExpandResponse('["  A  ", "", "B"]')).toEqual(["A", "B"]);
  });
  it("returns an empty array for unparseable input", () => {
    expect(parseExpandResponse("   ")).toEqual([]);
  });
});
