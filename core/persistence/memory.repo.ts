import { and, desc, eq } from "drizzle-orm";
import { memoryNotes, type MemoryNote } from "./schema";

type Db = {
  select: (...args: never[]) => never;
} & Record<string, unknown>;

/** Loosely typed to match the other repos, which take the drizzle db directly. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Database = any;

export async function listNotes(db: Database, ownerId: string): Promise<MemoryNote[]> {
  return db
    .select()
    .from(memoryNotes)
    .where(eq(memoryNotes.ownerId, ownerId))
    .orderBy(desc(memoryNotes.updatedAt));
}

export async function getNote(
  db: Database,
  { ownerId, id }: { ownerId: string; id: string },
): Promise<MemoryNote | undefined> {
  const rows = await db
    .select()
    .from(memoryNotes)
    .where(and(eq(memoryNotes.id, id), eq(memoryNotes.ownerId, ownerId)))
    .limit(1);
  return rows[0];
}

/**
 * Creates or renames-in-place. Title is unique per owner, so writing a note
 * whose title already exists updates that note rather than making a twin —
 * which is what makes [[links]] resolve predictably.
 */
export async function upsertNote(
  db: Database,
  { ownerId, title, body }: { ownerId: string; title: string; body: string },
): Promise<MemoryNote> {
  const rows = await db
    .insert(memoryNotes)
    .values({ ownerId, title: title.trim(), body })
    .onConflictDoUpdate({
      target: [memoryNotes.ownerId, memoryNotes.title],
      set: { body, updatedAt: new Date() },
    })
    .returning();
  return rows[0];
}

export async function updateNote(
  db: Database,
  { ownerId, id, title, body }: { ownerId: string; id: string; title?: string; body?: string },
): Promise<MemoryNote | undefined> {
  const rows = await db
    .update(memoryNotes)
    .set({
      ...(title !== undefined ? { title: title.trim() } : {}),
      ...(body !== undefined ? { body } : {}),
      updatedAt: new Date(),
    })
    .where(and(eq(memoryNotes.id, id), eq(memoryNotes.ownerId, ownerId)))
    .returning();
  return rows[0];
}

export async function deleteNote(
  db: Database,
  { ownerId, id }: { ownerId: string; id: string },
): Promise<void> {
  await db
    .delete(memoryNotes)
    .where(and(eq(memoryNotes.id, id), eq(memoryNotes.ownerId, ownerId)));
}

export type { Db };
