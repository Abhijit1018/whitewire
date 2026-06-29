import { auth, currentUser } from "@clerk/nextjs/server";
import { db } from "@/core/persistence/db";
import { ensureUser } from "@/core/persistence/users.repo";

/** Returns the Clerk user id, redirect-protected by middleware. */
export async function getCurrentUserId(): Promise<string> {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthenticated");
  return userId;
}

/** Ensures the Clerk user exists in our db, returns the user id. */
export async function syncCurrentUser(): Promise<string> {
  const u = await currentUser();
  if (!u) throw new Error("Unauthenticated");
  const email = u.primaryEmailAddress?.emailAddress ?? "";
  await ensureUser(db, { id: u.id, email });
  return u.id;
}
