"use server";

export async function commandGenerateAction(
  projectId: string,
  prompt: string,
): Promise<{ text: string }> {
  const { generateNode } = await import("@/core/ai/generate");
  const { resolveModel } = await import("@/core/ai/resolve-model");
  const { model } = await resolveModel(projectId);
  const text = await generateNode(model, prompt);
  return { text };
}

export async function expandAction(
  projectId: string,
  text: string,
): Promise<{ items: string[] }> {
  const { generateNode } = await import("@/core/ai/generate");
  const { buildExpandPrompt, parseExpandResponse } = await import("@/core/ai/prompts");
  const { resolveModel } = await import("@/core/ai/resolve-model");
  const { model } = await resolveModel(projectId);
  const raw = await generateNode(model, buildExpandPrompt(text));
  return { items: parseExpandResponse(raw) };
}
