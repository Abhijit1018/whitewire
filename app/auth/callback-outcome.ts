/**
 * Pure decision logic for the OAuth callback, extracted so it can be unit-tested
 * without mocking Supabase or Next's routing — mirroring `signup-outcome.ts`.
 */
export type CallbackResult = {
  /** The `code` query param Supabase appends on success. */
  code?: string | null;
  /** `error_description` (or `error`) the provider sends when the user declines. */
  providerError?: string | null;
  /** Message from `exchangeCodeForSession`, if the exchange failed. */
  exchangeError?: string | null;
  /** Optional post-login destination. */
  next?: string | null;
};

export type CallbackOutcome = { redirect: string; shouldExchange: boolean };

const GENERIC = "That sign-in link was invalid or has expired. Please try again.";

function fail(message: string): CallbackOutcome {
  return { redirect: "/sign-in?error=" + encodeURIComponent(message), shouldExchange: false };
}

/** Only same-origin relative paths are honoured, so `next` can't be used as an open redirect. */
function safeNext(next: string | null | undefined): string | null {
  if (!next || !next.startsWith("/") || next.startsWith("//")) return null;
  return next;
}

export function callbackOutcome(result: CallbackResult): CallbackOutcome {
  const { code, providerError, exchangeError, next } = result;

  if (providerError) return fail(providerError);
  if (!code) return fail(GENERIC);
  if (exchangeError) return fail(exchangeError);

  return { redirect: safeNext(next) ?? "/dashboard", shouldExchange: true };
}
