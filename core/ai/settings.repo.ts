import { and, eq } from "drizzle-orm";
import { apiKeys, userSettings } from "@/core/persistence/schema";
import type { Db } from "@/core/persistence/projects.repo";

export type Settings = { activeKeyId: string | null; routes: Record<string, string> };

async function assertOwnsKey(db: Db, keyId: string, ownerId: string) {
  const [owned] = await db
    .select({ id: apiKeys.id })
    .from(apiKeys)
    .where(and(eq(apiKeys.id, keyId), eq(apiKeys.userId, ownerId)));
  if (!owned) throw new Error("Key not found");
}

export async function getSettings(db: Db, ownerId: string): Promise<Settings> {
  const [row] = await db
    .select({ activeKeyId: userSettings.activeKeyId, routes: userSettings.routes })
    .from(userSettings)
    .where(eq(userSettings.userId, ownerId));
  return { activeKeyId: row?.activeKeyId ?? null, routes: row?.routes ?? {} };
}

export async function setActiveKey(
  db: Db,
  input: { ownerId: string; keyId: string | null },
): Promise<void> {
  if (input.keyId !== null) await assertOwnsKey(db, input.keyId, input.ownerId);
  await db
    .insert(userSettings)
    .values({ userId: input.ownerId, activeKeyId: input.keyId })
    .onConflictDoUpdate({ target: userSettings.userId, set: { activeKeyId: input.keyId } });
}

/** Sets (or clears, when keyId is null) the model used for a task role. */
export async function setRoute(
  db: Db,
  input: { ownerId: string; role: string; keyId: string | null },
): Promise<void> {
  if (input.keyId !== null) await assertOwnsKey(db, input.keyId, input.ownerId);
  const current = await getSettings(db, input.ownerId);
  const routes = { ...current.routes };
  if (input.keyId) routes[input.role] = input.keyId;
  else delete routes[input.role];
  await db
    .insert(userSettings)
    .values({ userId: input.ownerId, routes })
    .onConflictDoUpdate({ target: userSettings.userId, set: { routes } });
}
