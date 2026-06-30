"use server";

const ATTACH_TYPES = ["note", "link", "comment", "snippet"];

export async function addAttachmentAction(
  projectId: string,
  sourceNodeId: string,
  type: string,
  content: string,
) {
  if (!ATTACH_TYPES.includes(type)) throw new Error("invalid attachment type");
  const trimmed = content.trim();
  if (!trimmed) throw new Error("content required");
  const { db } = await import("@/core/persistence/db");
  const { syncCurrentUser } = await import("@/lib/auth");
  const { addAttachment } = await import("@/core/persistence/attachments.repo");
  const ownerId = await syncCurrentUser();
  return addAttachment(db, { ownerId, projectId, sourceNodeId, type, content: trimmed });
}

export async function listNodeAttachmentsAction(projectId: string, sourceNodeId: string) {
  const { db } = await import("@/core/persistence/db");
  const { syncCurrentUser } = await import("@/lib/auth");
  const { listAttachmentsByNode } = await import("@/core/persistence/attachments.repo");
  const ownerId = await syncCurrentUser();
  return listAttachmentsByNode(db, { ownerId, projectId, sourceNodeId });
}

export async function deleteAttachmentAction(id: string) {
  const { db } = await import("@/core/persistence/db");
  const { syncCurrentUser } = await import("@/lib/auth");
  const { deleteAttachment } = await import("@/core/persistence/attachments.repo");
  const ownerId = await syncCurrentUser();
  await deleteAttachment(db, { ownerId, id });
}
