import { NextResponse, type NextRequest } from "next/server";
import { updateSession } from "@/core/supabase/middleware";

/** The domain that should own the ranking signals and the session cookies. */
const CANONICAL_HOST = "whitewire.abhijit-singh.in";

/**
 * Only the stable production aliases redirect. Preview deployments are also
 * *.vercel.app — redirecting those would silently send every preview to
 * production and make them untestable.
 */
const REDIRECT_HOSTS = new Set([
  "whitewire.vercel.app",
  "whitewire-abhijit1018s-projects.vercel.app",
  "whitewire-abhijit1018-abhijit1018s-projects.vercel.app",
]);

export default async function proxy(request: NextRequest) {
  const host = request.headers.get("host")?.toLowerCase() ?? "";

  if (REDIRECT_HOSTS.has(host)) {
    const url = new URL(request.url);
    url.protocol = "https:";
    url.host = CANONICAL_HOST;
    url.port = "";
    // 307 rather than 308: browsers cache a permanent redirect hard, and this
    // should stay reversible until the move is proven.
    return NextResponse.redirect(url, 307);
  }

  return updateSession(request);
}

export const config = {
  // Crawler-facing routes must never be sent through the session check, or an
  // unauthenticated bot gets a redirect instead of the asset. opengraph-image
  // has no file extension, so the dot rule alone does not exclude it.
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|opengraph-image|twitter-image|robots|sitemap|llms|.*\\..*).*)",
  ],
};
