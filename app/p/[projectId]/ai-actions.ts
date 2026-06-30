"use server";

async function resolveModel(projectId: string) {
  const { db } = await import("@/core/persistence/db");
  const { syncCurrentUser } = await import("@/lib/auth");
  const { getProjectById } = await import("@/core/persistence/projects.repo");
  const { getSettings } = await import("@/core/ai/settings.repo");
  const { getDecryptedKey } = await import("@/core/ai/keys.repo");
  const { buildModel } = await import("@/core/ai/providers");

  const ownerId = await syncCurrentUser();
  const project = await getProjectById(db, { id: projectId, ownerId });
  if (!project) throw new Error("Project not found");
  const { activeKeyId } = await getSettings(db, ownerId);
  if (!activeKeyId) throw new Error("No active model. Add a key in Settings and make it active.");
  const key = await getDecryptedKey(db, { keyId: activeKeyId, ownerId });
  if (!key) throw new Error("Active model is unavailable. Re-select a key in Settings.");
  return buildModel(key);
}

export async function commandGenerateAction(
  projectId: string,
  prompt: string,
): Promise<{ text: string }> {
  const { generateNode } = await import("@/core/ai/generate");
  const model = await resolveModel(projectId);
  const text = await generateNode(model, prompt);
  return { text };
}

export async function expandAction(
  projectId: string,
  text: string,
): Promise<{ items: string[] }> {
  const { generateNode } = await import("@/core/ai/generate");
  const { buildExpandPrompt, parseExpandResponse } = await import("@/core/ai/prompts");
  const model = await resolveModel(projectId);
  const raw = await generateNode(model, buildExpandPrompt(text));
  return { items: parseExpandResponse(raw) };
}
