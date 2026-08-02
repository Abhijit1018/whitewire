"use server";

import { revalidatePath } from "next/cache";

async function context() {
  const { db } = await import("@/core/persistence/db");
  const { syncCurrentUser } = await import("@/lib/auth");
  const ownerId = await syncCurrentUser();
  return { db, ownerId };
}

export async function listNotesAction() {
  const { db, ownerId } = await context();
  const { listNotes } = await import("@/core/persistence/memory.repo");
  return listNotes(db, ownerId);
}

export async function saveNoteAction(formData: FormData) {
  const title = String(formData.get("title") ?? "").trim();
  if (!title) throw new Error("Title required");
  const body = String(formData.get("body") ?? "");
  const id = String(formData.get("id") ?? "");

  const { db, ownerId } = await context();
  const repo = await import("@/core/persistence/memory.repo");
  // Editing an existing note updates it in place; a new title creates a note,
  // or merges into one that already owns that title.
  if (id) await repo.updateNote(db, { ownerId, id, title, body });
  else await repo.upsertNote(db, { ownerId, title, body });
  revalidatePath("/memory");
}

export async function deleteNoteAction(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  if (!id) throw new Error("id required");
  const { db, ownerId } = await context();
  const { deleteNote } = await import("@/core/persistence/memory.repo");
  await deleteNote(db, { ownerId, id });
  revalidatePath("/memory");
}
