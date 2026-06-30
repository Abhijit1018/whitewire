import { describe, expect, it } from "vitest";
import { hashSource } from "@/core/artifacts/hash";

describe("hashSource", () => {
  it("is deterministic", () => {
    expect(hashSource("Login Page")).toBe(hashSource("Login Page"));
  });
  it("differs when text differs", () => {
    expect(hashSource("a")).not.toBe(hashSource("b"));
  });
  it("returns a non-empty hex string", () => {
    expect(hashSource("x")).toMatch(/^[0-9a-f]+$/);
  });
});
