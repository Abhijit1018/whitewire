"use server";

export async function commandGenerateAction(
  projectId: string,
  prompt: string,
): Promise<{ text?: string; error?: string }> {
  try {
    const { generateNode } = await import("@/core/ai/generate");
    const { resolveModel } = await import("@/core/ai/resolve-model");
    const { model } = await resolveModel(projectId);
    const text = await generateNode(model, prompt);
    return { text };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Generation failed" };
  }
}

export async function expandAction(
  projectId: string,
  text: string,
): Promise<{ items?: string[]; error?: string }> {
  try {
    const { generateNode } = await import("@/core/ai/generate");
    const { buildExpandPrompt, parseExpandResponse } = await import("@/core/ai/prompts");
    const { resolveModel } = await import("@/core/ai/resolve-model");
    const { model } = await resolveModel(projectId);
    const raw = await generateNode(model, buildExpandPrompt(text));
    return { items: parseExpandResponse(raw) };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Expand failed" };
  }
}
