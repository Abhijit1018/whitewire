"use server";

import { revalidatePath } from "next/cache";

export async function setSharingAction(
  projectId: string,
  enabled: boolean,
  role: "editor" | "viewer",
) {
  const { db } = await import("@/core/persistence/db");
  const { syncCurrentUser } = await import("@/lib/auth");
  const { setSharing } = await import("@/core/persistence/projects.repo");
  const ownerId = await syncCurrentUser();
  const updated = await setSharing(db, { projectId, ownerId, enabled, role });
  if (!updated) throw new Error("Only the owner can change sharing");
  revalidatePath(`/p/${projectId}`);
  return { shareEnabled: updated.shareEnabled, shareRole: updated.shareRole };
}
