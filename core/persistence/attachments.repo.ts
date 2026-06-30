import { and, desc, eq, getTableColumns, inArray } from "drizzle-orm";
import { attachments, projects, type Attachment } from "./schema";
import type { Db } from "./projects.repo";

export async function addAttachment(
  db: Db,
  input: { ownerId: string; projectId: string; sourceNodeId: string; type: string; content: string },
): Promise<Attachment> {
  const [owned] = await db
    .select({ id: projects.id })
    .from(projects)
    .where(and(eq(projects.id, input.projectId), eq(projects.ownerId, input.ownerId)));
  if (!owned) throw new Error("Project not found");
  const [row] = await db
    .insert(attachments)
    .values({
      projectId: input.projectId,
      sourceNodeId: input.sourceNodeId,
      type: input.type,
      content: input.content,
    })
    .returning();
  return row;
}

export async function listAttachmentsByNode(
  db: Db,
  input: { ownerId: string; projectId: string; sourceNodeId: string },
): Promise<Attachment[]> {
  return db
    .select(getTableColumns(attachments))
    .from(attachments)
    .innerJoin(projects, eq(attachments.projectId, projects.id))
    .where(
      and(
        eq(projects.ownerId, input.ownerId),
        eq(attachments.projectId, input.projectId),
        eq(attachments.sourceNodeId, input.sourceNodeId),
      ),
    )
    .orderBy(desc(attachments.createdAt));
}

export async function deleteAttachment(db: Db, input: { ownerId: string; id: string }): Promise<void> {
  // delete only if the attachment's project is owned by the caller
  const owned = db
    .select({ id: attachments.id })
    .from(attachments)
    .innerJoin(projects, eq(attachments.projectId, projects.id))
    .where(and(eq(attachments.id, input.id), eq(projects.ownerId, input.ownerId)));
  await db.delete(attachments).where(inArray(attachments.id, owned));
}
