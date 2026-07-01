"use server";

import type { BlueprintNode } from "@/core/ai/blueprint";

export async function interpretSketchAction(
  projectId: string,
  imageDataUrl: string,
): Promise<{ nodes?: BlueprintNode[]; edges?: [number, number][]; error?: string }> {
  try {
    const { resolveModel } = await import("@/core/ai/resolve-model");
    const { generateVision } = await import("@/core/ai/generate");
    const { parseBlueprint } = await import("@/core/ai/blueprint");
    const { model, ownerId } = await resolveModel(projectId, "reasoning");

    const prompt = [
      "This image is a hand-drawn sketch of a UI or system diagram.",
      "Interpret the boxes, shapes, arrows and any text into a clean board of concepts.",
      "Reply with ONLY JSON:",
      `{"nodes":[{"title":"short name","kind":"feature|component|entity|idea","note":"one line"}],"edges":[[fromIndex,toIndex]]}`,
      "Use 3-9 nodes. edges reference node indexes (0-based).",
    ].join("\n");

    const raw = await generateVision(model, prompt, imageDataUrl);
    try {
      const { db } = await import("@/core/persistence/db");
      const { logPrompt } = await import("@/core/persistence/versions.repo");
      await logPrompt(db, { ownerId, projectId, kind: "sketch", prompt: "[sketch image]", output: raw });
    } catch {
      // best-effort history
    }

    const bp = parseBlueprint(raw);
    if (bp.nodes.length === 0) {
      return {
        error:
          "Couldn't read the sketch. Set a vision-capable model active (e.g. gpt-4o, claude-3-5-sonnet, gemini) — text-only models like Groq Llama can't see images.",
      };
    }
    return { nodes: bp.nodes, edges: bp.edges };
  } catch (e) {
    return {
      error:
        "Vision failed — your active model may not support images. " +
        (e instanceof Error ? e.message : ""),
    };
  }
}
