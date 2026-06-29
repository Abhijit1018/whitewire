import { currentUser } from "@clerk/nextjs/server";
import { db as defaultDb } from "@/core/persistence/db";
import { ensureUser } from "@/core/persistence/users.repo";
import type { Db } from "@/core/persistence/projects.repo";

/** Ensures the Clerk user exists in our db, returns the user id. */
export async function syncCurrentUser(database: Db = defaultDb): Promise<string> {
  const u = await currentUser();
  if (!u) throw new Error("Unauthenticated");
  const email = u.primaryEmailAddress?.emailAddress ?? "";
  await ensureUser(database, { id: u.id, email });
  return u.id;
}
