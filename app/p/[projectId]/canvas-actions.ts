"use server";

export async function saveCanvasAction(
  projectId: string,
  snapshot: Record<string, unknown>,
) {
  const { db } = await import("@/core/persistence/db");
  const { syncCurrentUser } = await import("@/lib/auth");
  const { getProjectAccess, canEditRole } = await import("@/core/persistence/projects.repo");
  const { saveCanvasSnapshot } = await import("@/core/persistence/canvas.repo");
  try {
    const userId = await syncCurrentUser();
    const access = await getProjectAccess(db, { projectId, userId });
    if (!access || !canEditRole(access.role)) throw new Error("No edit access to this project");
    await saveCanvasSnapshot(db, { projectId, snapshot });
  } catch (err) {
    console.error("saveCanvasAction failed", { projectId, err });
    throw err; // rethrow so the client debouncer can roll back and retry
  }
}
