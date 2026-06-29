import { notFound } from "next/navigation";
import { db } from "@/core/persistence/db";
import { getProjectById } from "@/core/persistence/projects.repo";
import { getCanvas } from "@/core/persistence/canvas.repo";
import { syncCurrentUser } from "@/lib/auth";
import { WorkspaceShell } from "@/components/workspace/workspace-shell";
import { Whiteboard } from "@/components/canvas/whiteboard";

export default async function WorkspacePage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const { projectId } = await params;
  const ownerId = await syncCurrentUser();
  const project = await getProjectById(db, { id: projectId, ownerId });
  if (!project) notFound();
  const initial = (await getCanvas(db, { projectId: project.id, ownerId })) ?? null;
  return (
    <WorkspaceShell projectId={project.id} name={project.name}>
      <Whiteboard projectId={project.id} initial={initial} />
    </WorkspaceShell>
  );
}
