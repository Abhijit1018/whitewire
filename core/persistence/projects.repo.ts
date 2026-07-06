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

export async function getProjectById(
  db: Db,
  input: { id: string; ownerId: string },
): Promise<Project | undefined> {
  const [row] = await db
    .select()
    .from(projects)
    .where(and(eq(projects.id, input.id), eq(projects.ownerId, input.ownerId)));
  return row;
}

export type Role = "owner" | "editor" | "viewer";

/**
 * Resolve a user's access to a project: owner, or (when link sharing is on)
 * the project's shared role. Returns null when the user has no access.
 */
export async function getProjectAccess(
  db: Db,
  input: { projectId: string; userId: string },
): Promise<{ project: Project; role: Role } | null> {
  const [project] = await db.select().from(projects).where(eq(projects.id, input.projectId));
  if (!project) return null;
  if (project.ownerId === input.userId) return { project, role: "owner" };
  if (project.shareEnabled) return { project, role: project.shareRole === "viewer" ? "viewer" : "editor" };
  return null;
}

export function canEditRole(role: Role): boolean {
  return role === "owner" || role === "editor";
}

/** Owner-only: toggle link sharing and its role. */
export async function setSharing(
  db: Db,
  input: { projectId: string; ownerId: string; enabled: boolean; role: "editor" | "viewer" },
): Promise<Project | undefined> {
  const [row] = await db
    .update(projects)
    .set({ shareEnabled: input.enabled, shareRole: input.role, updatedAt: new Date() })
    .where(and(eq(projects.id, input.projectId), eq(projects.ownerId, input.ownerId)))
    .returning();
  return row;
}
