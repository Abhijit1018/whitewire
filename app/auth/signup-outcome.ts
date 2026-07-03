/**
 * Pure decision logic for what to do after a Supabase `signUp` call, extracted so
 * it can be unit-tested without mocking Supabase or Next's `redirect`.
 *
 * Supabase behaviour this maps:
 * - New email (autoconfirm on): a session is returned  -> go to the app.
 * - Existing email (autoconfirm on): `error` "User already registered".
 * - Existing email (confirmations on): anti-enumeration returns a user with an
 *   EMPTY `identities` array and no session, and NO error — we must not tell the
 *   user "check your email" in that case, it means the account already exists.
 * - New email (confirmations on): user + no session, identities non-empty -> confirm.
 */
export type SignUpResult = {
  hasSession: boolean;
  /** number of identities on the returned user (undefined if no user) */
  identityCount?: number;
  /** Supabase error message, if any */
  errorMessage?: string | null;
};

export type SignUpOutcome = { redirect: string };

const ALREADY_EXISTS =
  "An account with this email already exists. Please sign in instead.";

export function signUpOutcome(result: SignUpResult): SignUpOutcome {
  const { hasSession, identityCount, errorMessage } = result;

  if (errorMessage) {
    const friendly = /already|exists|registered/i.test(errorMessage)
      ? ALREADY_EXISTS
      : errorMessage;
    return { redirect: "/sign-up?error=" + encodeURIComponent(friendly) };
  }

  // Anti-enumeration: an existing account comes back with no identities.
  if (identityCount === 0) {
    return { redirect: "/sign-up?error=" + encodeURIComponent(ALREADY_EXISTS) };
  }

  if (hasSession) {
    return { redirect: "/dashboard" };
  }

  // Genuinely new account awaiting email confirmation.
  return {
    redirect:
      "/sign-in?error=" +
      encodeURIComponent("Check your email to confirm, then sign in."),
  };
}
