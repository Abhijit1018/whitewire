import { cookies } from "next/headers";
import { db as defaultDb } from "@/core/persistence/db";
import { ensureUser } from "@/core/persistence/users.repo";
import type { Db } from "@/core/persistence/projects.repo";
import { createClient } from "@/core/supabase/server";

/**
 * Cheap signed-in check for nav toggles on marketing/content pages.
 * Only reads cookie presence — no network roundtrip to Supabase Auth (unlike
 * `getUser()`), which keeps these pages fast. The proxy middleware already
 * validates/refreshes the session on every request, so cookie presence is a
 * safe proxy for "has a session" when we only need it to pick a CTA.
 */
export async function hasSession(): Promise<boolean> {
  const store = await cookies();
  return store.getAll().some((c) => c.name.startsWith("sb-") && c.name.includes("-auth-token"));
}

/** Ensures the signed-in Supabase user exists in our db, returns the user id. */
export async function syncCurrentUser(database: Db = defaultDb): Promise<string> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthenticated");
  await ensureUser(database, { id: user.id, email: user.email ?? "" });
  return user.id;
}
