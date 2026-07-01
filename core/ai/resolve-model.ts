import "server-only";
import { db } from "@/core/persistence/db";
import { syncCurrentUser } from "@/lib/auth";
import { getProjectById } from "@/core/persistence/projects.repo";
import { getSettings } from "@/core/ai/settings.repo";
import { getDecryptedKey } from "@/core/ai/keys.repo";
import { buildModel } from "@/core/ai/providers";
import type { LanguageModel } from "ai";

export async function resolveModel(
  projectId: string,
  role?: string,
): Promise<{ model: LanguageModel; ownerId: string }> {
  const ownerId = await syncCurrentUser();
  const project = await getProjectById(db, { id: projectId, ownerId });
  if (!project) throw new Error("Project not found");
  const { activeKeyId, routes } = await getSettings(db, ownerId);
  const keyId = (role && routes[role]) || activeKeyId;
  if (!keyId) throw new Error("No active model. Add a key in Settings and make it active.");
  const key = await getDecryptedKey(db, { keyId, ownerId });
  if (!key) throw new Error("Active model is unavailable. Re-select a key in Settings.");
  return { model: buildModel(key), ownerId };
}
