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
    const { model, ownerId } = await resolveModel(projectId, "reasoning");
    const raw = await generateNode(model, buildArchitectPrompt(board));
    try {
      const { db } = await import("@/core/persistence/db");
      const { logPrompt } = await import("@/core/persistence/versions.repo");
      await logPrompt(db, { ownerId, projectId, kind: "architect", prompt: board, output: raw });
    } catch {
      // best-effort history
    }
    return { result: parseArchitectResponse(raw) };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Architect failed" };
  }
}
