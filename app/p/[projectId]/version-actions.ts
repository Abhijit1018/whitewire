"use server";

export async function saveVersionAction(
  projectId: string,
  snapshot: Record<string, unknown>,
  label: string,
): Promise<{ error?: string }> {
  try {
    const { db } = await import("@/core/persistence/db");
    const { syncCurrentUser } = await import("@/lib/auth");
    const { saveVersion } = await import("@/core/persistence/versions.repo");
    const ownerId = await syncCurrentUser();
    await saveVersion(db, {
      ownerId,
      projectId,
      label: label.trim() || new Date().toLocaleString(),
      snapshot,
    });
    return {};
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Save failed" };
  }
}

export async function listVersionsAction(projectId: string) {
  const { db } = await import("@/core/persistence/db");
  const { syncCurrentUser } = await import("@/lib/auth");
  const { listVersions } = await import("@/core/persistence/versions.repo");
  const ownerId = await syncCurrentUser();
  return listVersions(db, { ownerId, projectId });
}

export async function restoreVersionAction(
  id: string,
): Promise<{ snapshot?: Record<string, unknown>; error?: string }> {
  try {
    const { db } = await import("@/core/persistence/db");
    const { syncCurrentUser } = await import("@/lib/auth");
    const { getVersionSnapshot } = await import("@/core/persistence/versions.repo");
    const ownerId = await syncCurrentUser();
    const snapshot = await getVersionSnapshot(db, { ownerId, id });
    if (!snapshot) return { error: "Version not found" };
    return { snapshot };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Restore failed" };
  }
}

export async function listPromptsAction(projectId: string) {
  const { db } = await import("@/core/persistence/db");
  const { syncCurrentUser } = await import("@/lib/auth");
  const { listPrompts } = await import("@/core/persistence/versions.repo");
  const ownerId = await syncCurrentUser();
  return listPrompts(db, { ownerId, projectId });
}
