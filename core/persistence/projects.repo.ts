import { and, desc, eq } from "drizzle-orm";
import { projects, type Project } from "./schema";

export type Db = any; // drizzle instance (Neon or PGlite)

export async function createProject(
  db: Db,
  input: { ownerId: string; name: string },
): Promise<Project> {
  const [row] = await db.insert(projects).values(input).returning();
  return row;
}

export async function listProjects(db: Db, ownerId: string): Promise<Project[]> {
  return db
    .select()
    .from(projects)
    .where(eq(projects.ownerId, ownerId))
    .orderBy(desc(projects.updatedAt));
}

export async function renameProject(
  db: Db,
  input: { id: string; ownerId: string; name: string },
): Promise<Project | undefined> {
  const [row] = await db
    .update(projects)
    .set({ name: input.name, updatedAt: new Date() })
    .where(and(eq(projects.id, input.id), eq(projects.ownerId, input.ownerId)))
    .returning();
  return row;
}

export async function deleteProject(
  db: Db,
  input: { id: string; ownerId: string },
): Promise<void> {
  await db
    .delete(projects)
    .where(and(eq(projects.id, input.id), eq(projects.ownerId, input.ownerId)));
}
