import { notFound } from "next/navigation";
import { db } from "@/core/persistence/db";
import { getProjectById } from "@/core/persistence/projects.repo";
import { syncCurrentUser } from "@/lib/auth";
import { WorkspaceShell } from "@/components/workspace/workspace-shell";

export default async function WorkspacePage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const { projectId } = await params;
  const ownerId = await syncCurrentUser();
  const project = await getProjectById(db, { id: projectId, ownerId });
  if (!project) notFound();
  return <WorkspaceShell projectId={project.id} name={project.name} />;
}
