import { and, desc, eq, getTableColumns } from "drizzle-orm";
import { artifacts, projects, type Artifact } from "./schema";
import type { Db } from "./projects.repo";

async function assertOwns(db: Db, projectId: string, ownerId: string) {
  const [owned] = await db
    .select({ id: projects.id })
    .from(projects)
    .where(and(eq(projects.id, projectId), eq(projects.ownerId, ownerId)));
  if (!owned) throw new Error("Project not found");
}

export async function upsertArtifact(
  db: Db,
  input: { ownerId: string; projectId: string; sourceNodeId: string; type: string; content: string; sourceHash: string },
): Promise<Artifact> {
  await assertOwns(db, input.projectId, input.ownerId);
  const [row] = await db
    .insert(artifacts)
    .values({
      projectId: input.projectId,
      sourceNodeId: input.sourceNodeId,
      type: input.type,
      content: input.content,
      sourceHash: input.sourceHash,
    })
    .onConflictDoUpdate({
      target: [artifacts.projectId, artifacts.sourceNodeId, artifacts.type],
      set: { content: input.content, sourceHash: input.sourceHash, updatedAt: new Date() },
    })
    .returning();
  return row;
}

export async function listArtifactsByNode(
  db: Db,
  input: { ownerId: string; projectId: string; sourceNodeId: string },
): Promise<Artifact[]> {
  return db
    .select(getTableColumns(artifacts))
    .from(artifacts)
    .innerJoin(projects, eq(artifacts.projectId, projects.id))
    .where(
      and(
        eq(projects.ownerId, input.ownerId),
        eq(artifacts.projectId, input.projectId),
        eq(artifacts.sourceNodeId, input.sourceNodeId),
      ),
    )
    .orderBy(artifacts.type);
}

export async function listArtifactsByProject(
  db: Db,
  input: { ownerId: string; projectId: string },
): Promise<Artifact[]> {
  return db
    .select(getTableColumns(artifacts))
    .from(artifacts)
    .innerJoin(projects, eq(artifacts.projectId, projects.id))
    .where(and(eq(projects.ownerId, input.ownerId), eq(artifacts.projectId, input.projectId)))
    .orderBy(desc(artifacts.updatedAt));
}

export async function listArtifactsByOwner(
  db: Db,
  ownerId: string,
): Promise<(Artifact & { projectName: string })[]> {
  return db
    .select({ ...getTableColumns(artifacts), projectName: projects.name })
    .from(artifacts)
    .innerJoin(projects, eq(artifacts.projectId, projects.id))
    .where(eq(projects.ownerId, ownerId))
    .orderBy(desc(artifacts.updatedAt));
}
