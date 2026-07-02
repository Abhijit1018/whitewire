import "server-only";
import { eq } from "drizzle-orm";
import type { Db } from "@/core/persistence/projects.repo";
import { projects, users } from "@/core/persistence/schema";

/**
 * Deletes all data owned by a user. Projects are removed first (FK cascade wipes
 * canvas_docs, artifacts, attachments, versions, prompt_history), then the user row
 * (FK cascade wipes api_keys and user_settings).
 */
export async function purgeOwnerData(db: Db, ownerId: string): Promise<void> {
  await db.delete(projects).where(eq(projects.ownerId, ownerId));
  await db.delete(users).where(eq(users.id, ownerId));
}
