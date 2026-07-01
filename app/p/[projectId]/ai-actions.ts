"use server";

import type { BlueprintNode } from "@/core/ai/blueprint";

export async function commandGenerateAction(
  projectId: string,
  prompt: string,
): Promise<{ nodes?: BlueprintNode[]; edges?: [number, number][]; error?: string }> {
  try {
    const { generateNode } = await import("@/core/ai/generate");
    const { resolveModel } = await import("@/core/ai/resolve-model");
    const { buildBlueprintPrompt, parseBlueprint } = await import("@/core/ai/blueprint");
    const { model } = await resolveModel(projectId, "reasoning");
    const raw = await generateNode(model, buildBlueprintPrompt(prompt));
    const bp = parseBlueprint(raw);
    if (bp.nodes.length === 0) {
      // Fallback: one node from the first line so the user still gets something.
      const line = raw.split("\n").find((l) => l.trim()) ?? prompt;
      return { nodes: [{ title: line.trim().slice(0, 80), kind: "idea", note: "" }], edges: [] };
    }
    return { nodes: bp.nodes, edges: bp.edges };
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
    const { model } = await resolveModel(projectId, "reasoning");
    const raw = await generateNode(model, buildExpandPrompt(text));
    return { items: parseExpandResponse(raw) };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Expand failed" };
  }
}
