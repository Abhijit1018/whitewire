"use server";

import { revalidatePath } from "next/cache";
import {
  createProject,
  deleteProject,
  renameProject,
  type Db,
} from "@/core/persistence/projects.repo";

// --- Pure logic (unit tested) ---

export async function createProjectLogic(database: Db, ownerId: string, name: string) {
  const trimmed = name.trim();
  if (!trimmed) throw new Error("Name required");
  return createProject(database, { ownerId, name: trimmed });
}

export async function deleteProjectLogic(database: Db, ownerId: string, id: string) {
  return deleteProject(database, { id, ownerId });
}

// --- Server actions (called from UI) ---

export async function createProjectAction(formData: FormData) {
  const { db } = await import("@/core/persistence/db");
  const { syncCurrentUser } = await import("@/lib/auth");
  const ownerId = await syncCurrentUser();
  const name = String(formData.get("name") ?? "");
  const templateId = String(formData.get("template") ?? "blank");
  const project = await createProjectLogic(db, ownerId, name);

  // Seed the new board from a template plugin (the same registry the canvas
  // Plugins menu uses), so "Start from" isn't just cosmetic.
  if (templateId && templateId !== "blank") {
    const { getPlugin } = await import("@/core/plugins/registry");
    const { saveCanvas } = await import("@/core/persistence/canvas.repo");
    const plugin = getPlugin(templateId);
    if (plugin) {
      const { nodes, edges } = plugin.run({ center: { x: 400, y: 300 } });
      await saveCanvas(db, { projectId: project.id, ownerId, snapshot: { nodes, edges } });
    }
  }
  revalidatePath("/dashboard");
}

export async function renameProjectAction(formData: FormData) {
  const { db } = await import("@/core/persistence/db");
  const { syncCurrentUser } = await import("@/lib/auth");
  const ownerId = await syncCurrentUser();
  const id = String(formData.get("id") ?? "");
  if (!id) throw new Error("id required");
  const name = String(formData.get("name") ?? "").trim();
  if (!name) throw new Error("Name required");
  const updated = await renameProject(db, { id, ownerId, name });
  if (!updated) throw new Error("Project not found");
  revalidatePath("/dashboard");
}

export async function deleteProjectAction(formData: FormData) {
  const { db } = await import("@/core/persistence/db");
  const { syncCurrentUser } = await import("@/lib/auth");
  const ownerId = await syncCurrentUser();
  const id = String(formData.get("id") ?? "");
  if (!id) throw new Error("id required");
  await deleteProjectLogic(db, ownerId, id);
  revalidatePath("/dashboard");
}
