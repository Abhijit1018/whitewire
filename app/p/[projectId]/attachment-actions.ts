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

export async function uploadFileAction(
  projectId: string,
  sourceNodeId: string,
  formData: FormData,
): Promise<{ error?: string }> {
  try {
    const file = formData.get("file") as File | null;
    if (!file || file.size === 0) return { error: "No file selected" };
    if (file.size > 6 * 1024 * 1024) return { error: "File too large (max 6MB)" };

    const { db } = await import("@/core/persistence/db");
    const { syncCurrentUser } = await import("@/lib/auth");
    const { getProjectById } = await import("@/core/persistence/projects.repo");
    const { addAttachment } = await import("@/core/persistence/attachments.repo");
    const { put } = await import("@vercel/blob");

    const ownerId = await syncCurrentUser();
    const project = await getProjectById(db, { id: projectId, ownerId });
    if (!project) return { error: "Project not found" };

    const blob = await put(`uploads/${projectId}/${crypto.randomUUID()}-${file.name}`, file, {
      access: "public",
      token: process.env.BLOB_READ_WRITE_TOKEN,
    });
    await addAttachment(db, {
      ownerId,
      projectId,
      sourceNodeId,
      type: "file",
      content: `${file.name}::${blob.url}`,
    });
    return {};
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Upload failed" };
  }
}

export async function deleteAttachmentAction(id: string) {
  const { db } = await import("@/core/persistence/db");
  const { syncCurrentUser } = await import("@/lib/auth");
  const { deleteAttachment } = await import("@/core/persistence/attachments.repo");
  const ownerId = await syncCurrentUser();
  await deleteAttachment(db, { ownerId, id });
}
