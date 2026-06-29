import { eq } from "drizzle-orm";
import { userSettings } from "@/core/persistence/schema";
import type { Db } from "@/core/persistence/projects.repo";

export async function getSettings(db: Db, ownerId: string): Promise<{ activeKeyId: string | null }> {
  const [row] = await db.select({ activeKeyId: userSettings.activeKeyId }).from(userSettings).where(eq(userSettings.userId, ownerId));
  return { activeKeyId: row?.activeKeyId ?? null };
}

export async function setActiveKey(db: Db, input: { ownerId: string; keyId: string | null }): Promise<void> {
  await db.insert(userSettings).values({ userId: input.ownerId, activeKeyId: input.keyId })
    .onConflictDoUpdate({ target: userSettings.userId, set: { activeKeyId: input.keyId } });
}
