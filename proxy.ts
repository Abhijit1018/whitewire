import { type NextRequest } from "next/server";
import { updateSession } from "@/core/supabase/middleware";

export default async function proxy(request: NextRequest) {
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
