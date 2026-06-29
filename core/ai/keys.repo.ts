import { and, desc, eq } from "drizzle-orm";
import { apiKeys, type KeyMetadata } from "@/core/persistence/schema";
import type { Db } from "@/core/persistence/projects.repo";
import { encrypt, decrypt, getEncryptionKey } from "./crypto";

const META = {
  id: apiKeys.id,
  provider: apiKeys.provider,
  label: apiKeys.label,
  baseUrl: apiKeys.baseUrl,
  model: apiKeys.model,
  createdAt: apiKeys.createdAt,
};

export async function addKey(
  db: Db,
  input: { ownerId: string; provider: string; label: string; baseUrl: string | null; model: string; apiKey: string },
): Promise<KeyMetadata> {
  const encrypted = encrypt(input.apiKey, getEncryptionKey());
  const [row] = await db
    .insert(apiKeys)
    .values({ userId: input.ownerId, provider: input.provider, label: input.label, baseUrl: input.baseUrl, model: input.model, encrypted })
    .returning(META);
  return row;
}

export async function listKeys(db: Db, ownerId: string): Promise<KeyMetadata[]> {
  return db.select(META).from(apiKeys).where(eq(apiKeys.userId, ownerId)).orderBy(desc(apiKeys.createdAt));
}

export async function deleteKey(db: Db, input: { id: string; ownerId: string }): Promise<void> {
  await db.delete(apiKeys).where(and(eq(apiKeys.id, input.id), eq(apiKeys.userId, input.ownerId)));
}

export async function getDecryptedKey(
  db: Db,
  input: { keyId: string; ownerId: string },
): Promise<{ provider: string; baseUrl: string | null; model: string; apiKey: string } | undefined> {
  const [row] = await db.select().from(apiKeys).where(and(eq(apiKeys.id, input.keyId), eq(apiKeys.userId, input.ownerId)));
  if (!row) return undefined;
  return { provider: row.provider, baseUrl: row.baseUrl, model: row.model, apiKey: decrypt(row.encrypted, getEncryptionKey()) };
}
