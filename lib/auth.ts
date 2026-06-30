import { db as defaultDb } from "@/core/persistence/db";
import { ensureUser } from "@/core/persistence/users.repo";
import type { Db } from "@/core/persistence/projects.repo";
import { createClient } from "@/core/supabase/server";

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
