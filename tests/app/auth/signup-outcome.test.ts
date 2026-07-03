import { describe, it, expect } from "vitest";
import { signUpOutcome } from "@/app/auth/signup-outcome";

describe("signUpOutcome", () => {
  it("sends a genuinely new account (with session) to the app", () => {
    expect(signUpOutcome({ hasSession: true, identityCount: 1 }).redirect).toBe(
      "/dashboard",
    );
  });

  it("maps an 'already registered' error to a friendly sign-in message", () => {
    const out = signUpOutcome({
      hasSession: false,
      errorMessage: "User already registered",
    });
    expect(out.redirect).toContain("/sign-up?error=");
    expect(decodeURIComponent(out.redirect)).toMatch(/already exists.*sign in/i);
  });

  it("treats the anti-enumeration empty-identities case as already-exists", () => {
    const out = signUpOutcome({ hasSession: false, identityCount: 0 });
    expect(decodeURIComponent(out.redirect)).toMatch(/already exists/i);
  });

  it("routes a real new-but-unconfirmed signup to the confirm message", () => {
    const out = signUpOutcome({ hasSession: false, identityCount: 1 });
    expect(out.redirect).toContain("/sign-in?error=");
    expect(decodeURIComponent(out.redirect)).toMatch(/confirm/i);
  });

  it("passes through an unrelated error unchanged", () => {
    const out = signUpOutcome({
      hasSession: false,
      errorMessage: "Password should be at least 6 characters",
    });
    expect(decodeURIComponent(out.redirect)).toMatch(/at least 6 characters/i);
  });
});
