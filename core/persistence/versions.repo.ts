import { and, desc, eq, getTableColumns } from "drizzle-orm";
import {
  promptHistory,
  projects,
  versions,
  type PromptEntry,
  type VersionMeta,
} from "./schema";
import type { Db } from "./projects.repo";

async function assertOwns(db: Db, projectId: string, ownerId: string) {
  const [owned] = await db
    .select({ id: projects.id })
    .from(projects)
    .where(and(eq(projects.id, projectId), eq(projects.ownerId, ownerId)));
  if (!owned) throw new Error("Project not found");
}

export async function saveVersion(
  db: Db,
  input: { ownerId: string; projectId: string; label: string; snapshot: Record<string, unknown> },
): Promise<VersionMeta> {
  await assertOwns(db, input.projectId, input.ownerId);
  const [row] = await db
    .insert(versions)
    .values({ projectId: input.projectId, label: input.label, snapshot: input.snapshot })
    .returning({ id: versions.id, label: versions.label, createdAt: versions.createdAt });
  return row;
}

export async function listVersions(
  db: Db,
  input: { ownerId: string; projectId: string },
): Promise<VersionMeta[]> {
  return db
    .select({ id: versions.id, label: versions.label, createdAt: versions.createdAt })
    .from(versions)
    .innerJoin(projects, eq(versions.projectId, projects.id))
    .where(and(eq(projects.ownerId, input.ownerId), eq(versions.projectId, input.projectId)))
    .orderBy(desc(versions.createdAt));
}

export async function getVersionSnapshot(
  db: Db,
  input: { ownerId: string; id: string },
): Promise<Record<string, unknown> | undefined> {
  const [row] = await db
    .select({ snapshot: versions.snapshot })
    .from(versions)
    .innerJoin(projects, eq(versions.projectId, projects.id))
    .where(and(eq(versions.id, input.id), eq(projects.ownerId, input.ownerId)));
  return row?.snapshot;
}

export async function logPrompt(
  db: Db,
  input: { ownerId: string; projectId: string; kind: string; prompt: string; output: string },
): Promise<void> {
  const [owned] = await db
    .select({ id: projects.id })
    .from(projects)
    .where(and(eq(projects.id, input.projectId), eq(projects.ownerId, input.ownerId)));
  if (!owned) return;
  await db.insert(promptHistory).values({
    projectId: input.projectId,
    kind: input.kind,
    prompt: input.prompt.slice(0, 8000),
    output: input.output.slice(0, 20000),
  });
}

export async function listPrompts(
  db: Db,
  input: { ownerId: string; projectId: string },
): Promise<PromptEntry[]> {
  return db
    .select(getTableColumns(promptHistory))
    .from(promptHistory)
    .innerJoin(projects, eq(promptHistory.projectId, projects.id))
    .where(and(eq(projects.ownerId, input.ownerId), eq(promptHistory.projectId, input.projectId)))
    .orderBy(desc(promptHistory.createdAt))
    .limit(50);
}
