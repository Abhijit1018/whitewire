import { notFound } from "next/navigation";
import { db } from "@/core/persistence/db";
import { getProjectAccess, canEditRole } from "@/core/persistence/projects.repo";
import { getCanvasByProjectId } from "@/core/persistence/canvas.repo";
import { syncCurrentUser } from "@/lib/auth";
import { WorkspaceShell } from "@/components/workspace/workspace-shell";
import { Whiteboard } from "@/components/canvas/whiteboard";

export default async function WorkspacePage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const { projectId } = await params;
  const userId = await syncCurrentUser();
  const access = await getProjectAccess(db, { projectId, userId });
  if (!access) notFound();
  const { project, role } = access;
  const canEdit = canEditRole(role);
  const initial = (await getCanvasByProjectId(db, project.id)) ?? null;
  return (
    <WorkspaceShell
      projectId={project.id}
      name={project.name}
      role={role}
      isOwner={role === "owner"}
      shareEnabled={project.shareEnabled}
      shareRole={project.shareRole === "viewer" ? "viewer" : "editor"}
    >
      <Whiteboard projectId={project.id} initial={initial} canEdit={canEdit} />
    </WorkspaceShell>
  );
}
