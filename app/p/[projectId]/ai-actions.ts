"use server";

import type { BlueprintNode } from "@/core/ai/blueprint";
import { toActionFailure, type ModelErrorCode } from "@/core/ai/model-errors";

async function logPrompt(
  projectId: string,
  ownerId: string,
  kind: string,
  prompt: string,
  output: string,
) {
  try {
    const { db } = await import("@/core/persistence/db");
    const { logPrompt: log } = await import("@/core/persistence/versions.repo");
    await log(db, { ownerId, projectId, kind, prompt, output });
  } catch {
    // history logging is best-effort — never block generation
  }
}

export async function commandGenerateAction(
  projectId: string,
  prompt: string,
): Promise<{
  nodes?: BlueprintNode[];
  edges?: [number, number][];
  error?: string;
  code?: ModelErrorCode | "failed";
}> {
  try {
    const { generateNode } = await import("@/core/ai/generate");
    const { resolveModel } = await import("@/core/ai/resolve-model");
    const { buildBlueprintPrompt, parseBlueprint } = await import("@/core/ai/blueprint");
    const { model, ownerId } = await resolveModel(projectId, "reasoning");
    const raw = await generateNode(model, buildBlueprintPrompt(prompt));
    await logPrompt(projectId, ownerId, "command", prompt, raw);
    const bp = parseBlueprint(raw);
    if (bp.nodes.length === 0) {
      // Fallback: one node from the first line so the user still gets something.
      const line = raw.split("\n").find((l) => l.trim()) ?? prompt;
      return { nodes: [{ title: line.trim().slice(0, 80), kind: "idea", note: "" }], edges: [] };
    }
    return { nodes: bp.nodes, edges: bp.edges };
  } catch (e) {
    return toActionFailure(e, "Generation failed");
  }
}

export async function expandAction(
  projectId: string,
  text: string,
): Promise<{ items?: string[]; error?: string; code?: ModelErrorCode | "failed" }> {
  try {
    const { generateNode } = await import("@/core/ai/generate");
    const { buildExpandPrompt, parseExpandResponse } = await import("@/core/ai/prompts");
    const { resolveModel } = await import("@/core/ai/resolve-model");
    const { model, ownerId } = await resolveModel(projectId, "reasoning");
    const raw = await generateNode(model, buildExpandPrompt(text));
    await logPrompt(projectId, ownerId, "expand", text, raw);
    return { items: parseExpandResponse(raw) };
  } catch (e) {
    return toActionFailure(e, "Expand failed");
  }
}
