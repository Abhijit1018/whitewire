import { describe, it, expect } from "vitest";
import { callbackOutcome } from "@/app/auth/callback-outcome";

describe("callbackOutcome", () => {
  it("exchanges the code and lands on the dashboard", () => {
    expect(callbackOutcome({ code: "abc" })).toEqual({
      redirect: "/dashboard",
      shouldExchange: true,
    });
  });

  it("honours a relative next destination", () => {
    expect(callbackOutcome({ code: "abc", next: "/p/123" }).redirect).toBe("/p/123");
  });

  it("refuses a protocol-relative next, which would be an open redirect", () => {
    expect(callbackOutcome({ code: "abc", next: "//evil.example" }).redirect).toBe("/dashboard");
  });

  it("refuses an absolute next", () => {
    expect(callbackOutcome({ code: "abc", next: "https://evil.example" }).redirect).toBe(
      "/dashboard",
    );
  });

  it("surfaces a provider error and skips the exchange", () => {
    const outcome = callbackOutcome({ code: "abc", providerError: "access_denied" });
    expect(outcome.shouldExchange).toBe(false);
    expect(outcome.redirect).toBe("/sign-in?error=access_denied");
  });

  it("reports a generic failure when no code came back", () => {
    const outcome = callbackOutcome({ code: null });
    expect(outcome.shouldExchange).toBe(false);
    expect(outcome.redirect).toContain("invalid%20or%20has%20expired");
  });

  it("surfaces a failed code exchange", () => {
    const outcome = callbackOutcome({ code: "abc", exchangeError: "bad code" });
    expect(outcome.shouldExchange).toBe(false);
    expect(outcome.redirect).toBe("/sign-in?error=bad%20code");
  });
});
