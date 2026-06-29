"use server";

export async function saveCanvasAction(
  projectId: string,
  snapshot: Record<string, unknown>,
) {
  const { db } = await import("@/core/persistence/db");
  const { syncCurrentUser } = await import("@/lib/auth");
  const { saveCanvas } = await import("@/core/persistence/canvas.repo");
  const ownerId = await syncCurrentUser();
  await saveCanvas(db, { projectId, ownerId, snapshot });
}
