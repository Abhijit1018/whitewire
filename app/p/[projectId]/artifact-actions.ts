"use server";

import type { GenType } from "@/core/artifacts/kinds";

const GEN_TYPES = ["schema", "api", "orm", "erd", "ui", "docs"];

export async function generateArtifactAction(
  projectId: string,
  sourceNodeId: string,
  type: string,
  sourceText: string,
): Promise<{ error?: string }> {
  if (!GEN_TYPES.includes(type)) return { error: "invalid artifact type" };
  if (!sourceText.trim()) return { error: "Node has no text to generate from" };
  try {
    const { resolveModel } = await import("@/core/ai/resolve-model");
    const { generateNode } = await import("@/core/ai/generate");
    const { buildArtifactPrompt } = await import("@/core/ai/artifact-prompts");
    const { hashSource } = await import("@/core/artifacts/hash");
    const { upsertArtifact } = await import("@/core/persistence/artifacts.repo");
    const { db } = await import("@/core/persistence/db");

    const role = type === "docs" ? "docs" : "code";
    const { model, ownerId } = await resolveModel(projectId, role);
    const content = await generateNode(model, buildArtifactPrompt(type as GenType, sourceText));
    await upsertArtifact(db, {
      ownerId,
      projectId,
      sourceNodeId,
      type,
      content,
      sourceHash: hashSource(sourceText),
    });
    return {};
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Generation failed" };
  }
}

export async function listNodeArtifactsAction(projectId: string, sourceNodeId: string) {
  const { db } = await import("@/core/persistence/db");
  const { syncCurrentUser } = await import("@/lib/auth");
  const { listArtifactsByNode } = await import("@/core/persistence/artifacts.repo");
  const ownerId = await syncCurrentUser();
  return listArtifactsByNode(db, { ownerId, projectId, sourceNodeId });
}
