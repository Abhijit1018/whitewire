import { describe, it, expect } from "vitest";
import { validatePasswordChange } from "@/app/account/validation";

describe("validatePasswordChange", () => {
  it("rejects mismatched passwords", () => {
    expect(validatePasswordChange("abcdef", "abcdeF")).toMatch(/match/i);
  });
  it("rejects short passwords", () => {
    expect(validatePasswordChange("abc", "abc")).toMatch(/6/);
  });
  it("accepts a valid matching password", () => {
    expect(validatePasswordChange("abcdef", "abcdef")).toBeNull();
  });
});
