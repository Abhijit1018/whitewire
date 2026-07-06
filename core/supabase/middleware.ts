import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

// Routes reachable without a session: auth flows + public marketing/content pages.
const PUBLIC_PREFIXES = [
  "/sign-in",
  "/sign-up",
  "/auth",
  "/about",
  "/docs",
  "/privacy",
  "/terms",
  "/contact",
  "/changelog",
];

function isPublic(pathname: string): boolean {
  return pathname === "/" || PUBLIC_PREFIXES.some((p) => pathname.startsWith(p));
}

function hasAuthCookie(request: NextRequest): boolean {
  return request.cookies
    .getAll()
    .some((c) => c.name.startsWith("sb-") && c.name.includes("-auth-token"));
}

/** Refreshes the Supabase session cookie and redirects unauthenticated users away from protected routes. */
export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });
  const pathname = request.nextUrl.pathname;

  // Fast path: an anonymous visitor (no auth cookie) on a public route never
  // needs the Supabase Auth server. Skipping the network call keeps public
  // pages fast even when Supabase is slow or unreachable.
  if (!hasAuthCookie(request) && isPublic(pathname)) {
    return response;
  }

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  // getUser() calls the Auth server. A network timeout or an invalid/expired
  // refresh token throws — treat any failure as "signed out" instead of
  // crashing the request (which previously surfaced as `fetch failed` and
  // spammed `refresh_token_not_found`).
  let user = null;
  try {
    const result = await supabase.auth.getUser();
    user = result.data.user;
  } catch {
    user = null;
  }

  if (!user && !isPublic(pathname)) {
    const url = request.nextUrl.clone();
    url.pathname = "/sign-in";
    return NextResponse.redirect(url);
  }

  return response;
}
