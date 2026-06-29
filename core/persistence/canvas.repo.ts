import { and, eq } from "drizzle-orm";
import { canvasDocs, projects } from "./schema";
import type { Db } from "./projects.repo";

export async function getCanvas(
  db: Db,
  input: { projectId: string; ownerId: string },
): Promise<Record<string, unknown> | undefined> {
  const [row] = await db
    .select({ snapshot: canvasDocs.snapshot })
    .from(canvasDocs)
    .innerJoin(projects, eq(canvasDocs.projectId, projects.id))
    .where(
      and(eq(canvasDocs.projectId, input.projectId), eq(projects.ownerId, input.ownerId)),
    );
  return row?.snapshot;
}

export async function saveCanvas(
  db: Db,
  input: { projectId: string; ownerId: string; snapshot: Record<string, unknown> },
): Promise<void> {
  const [owned] = await db
    .select({ id: projects.id })
    .from(projects)
    .where(and(eq(projects.id, input.projectId), eq(projects.ownerId, input.ownerId)));
  if (!owned) throw new Error("Project not found");

  await db
    .insert(canvasDocs)
    .values({ projectId: input.projectId, snapshot: input.snapshot })
    .onConflictDoUpdate({
      target: canvasDocs.projectId,
      set: { snapshot: input.snapshot, updatedAt: new Date() },
    });
}
