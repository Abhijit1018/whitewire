import { describe, it, expect } from "vitest";
import { isBlockedHost, assertAllowedBaseUrl } from "@/core/ai/net-guard";

describe("net-guard", () => {
  it("blocks cloud metadata + link-local", () => {
    expect(isBlockedHost("169.254.169.254")).toBe(true);
    expect(isBlockedHost("metadata.google.internal")).toBe(true);
    expect(isBlockedHost("fd00::1")).toBe(true);
  });
  it("allows normal + local hosts", () => {
    expect(isBlockedHost("api.openai.com")).toBe(false);
    expect(isBlockedHost("localhost")).toBe(false);
    expect(isBlockedHost("127.0.0.1")).toBe(false);
    expect(isBlockedHost("192.168.1.10")).toBe(false);
  });
  it("assertAllowedBaseUrl throws on blocked + bad protocol, passes normal", () => {
    expect(() => assertAllowedBaseUrl("http://169.254.169.254/v1")).toThrow(/not allowed/);
    expect(() => assertAllowedBaseUrl("ftp://x/y")).toThrow(/http/);
    expect(() => assertAllowedBaseUrl("not a url")).toThrow(/valid URL/);
    expect(() => assertAllowedBaseUrl("https://api.openai.com/v1")).not.toThrow();
  });
});
