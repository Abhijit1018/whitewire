import { NextResponse } from "next/server";
import { createClient } from "@/core/supabase/server";
import { callbackOutcome } from "../callback-outcome";

/**
 * OAuth redirect target. Supabase sends the browser here with a `code`, which we
 * trade for a session cookie before handing the user to the app.
 */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const providerError =
    url.searchParams.get("error_description") ?? url.searchParams.get("error");
  const next = url.searchParams.get("next");

  const preflight = callbackOutcome({ code, providerError, next });
  if (!preflight.shouldExchange) {
    return NextResponse.redirect(new URL(preflight.redirect, url.origin));
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.exchangeCodeForSession(code!);

  const outcome = callbackOutcome({ code, next, exchangeError: error?.message ?? null });
  return NextResponse.redirect(new URL(outcome.redirect, url.origin));
}
