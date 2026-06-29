import { notFound } from "next/navigation";
import { eq, and } from "drizzle-orm";
import { db } from "@/core/persistence/db";
import { projects } from "@/core/persistence/schema";
import { syncCurrentUser } from "@/lib/auth";
import { WorkspaceShell } from "@/components/workspace/workspace-shell";

export default async function WorkspacePage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const { projectId } = await params;
  const ownerId = await syncCurrentUser();
  const [project] = await db
    .select()
    .from(projects)
    .where(and(eq(projects.id, projectId), eq(projects.ownerId, ownerId)));
  if (!project) notFound();
  return <WorkspaceShell projectId={project.id} />;
}
