"use server";

import type { ArchitectResult } from "@/core/ai/architect";

export async function architectAction(
  projectId: string,
  board: string,
): Promise<{ result?: ArchitectResult; error?: string }> {
  try {
    const { resolveModel } = await import("@/core/ai/resolve-model");
    const { generateNode } = await import("@/core/ai/generate");
    const { buildArchitectPrompt, parseArchitectResponse } = await import("@/core/ai/architect");
    const { model } = await resolveModel(projectId, "reasoning");
    const raw = await generateNode(model, buildArchitectPrompt(board));
    return { result: parseArchitectResponse(raw) };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Architect failed" };
  }
}
