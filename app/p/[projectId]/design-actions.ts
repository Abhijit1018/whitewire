"use server";

import type { WireframeSpec } from "@/core/ai/wireframe";

export async function wireframeAction(
  projectId: string,
  description: string,
): Promise<{ spec?: WireframeSpec; error?: string }> {
  try {
    const { resolveModel } = await import("@/core/ai/resolve-model");
    const { generateNode } = await import("@/core/ai/generate");
    const { buildWireframePrompt, parseWireframe } = await import("@/core/ai/wireframe");
    const { model, ownerId } = await resolveModel(projectId, "code");
    const raw = await generateNode(model, buildWireframePrompt(description));
    try {
      const { db } = await import("@/core/persistence/db");
      const { logPrompt } = await import("@/core/persistence/versions.repo");
      await logPrompt(db, { ownerId, projectId, kind: "wireframe", prompt: description, output: raw });
    } catch {
      // best-effort history
    }
    return { spec: parseWireframe(raw) };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Wireframe failed" };
  }
}

export async function refineAction(
  projectId: string,
  text: string,
): Promise<{ text?: string; error?: string }> {
  try {
    const { resolveModel } = await import("@/core/ai/resolve-model");
    const { generateNode } = await import("@/core/ai/generate");
    const { model } = await resolveModel(projectId, "reasoning");
    const prompt = [
      "Improve and clarify the following node label so it reads as a clear, concrete concept.",
      "Fix wording and vagueness. Reply with ONLY the improved label (one short line, max 12 words).",
      `Label: ${text}`,
    ].join("\n");
    const raw = await generateNode(model, prompt);
    const cleaned = raw.split("\n").find((l) => l.trim())?.replace(/^["']|["']$/g, "").trim();
    return { text: (cleaned ?? "").slice(0, 120) };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Refine failed" };
  }
}
