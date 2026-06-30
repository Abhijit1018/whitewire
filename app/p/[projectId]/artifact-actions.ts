"use server";

import type { GenType } from "@/core/artifacts/kinds";

const GEN_TYPES = ["schema", "api", "ui", "docs"];

export async function generateArtifactAction(
  projectId: string,
  sourceNodeId: string,
  type: string,
  sourceText: string,
) {
  if (!GEN_TYPES.includes(type)) throw new Error("invalid artifact type");
  if (!sourceText.trim()) throw new Error("Node has no text to generate from");
  const { resolveModel } = await import("@/core/ai/resolve-model");
  const { generateNode } = await import("@/core/ai/generate");
  const { buildArtifactPrompt } = await import("@/core/ai/artifact-prompts");
  const { hashSource } = await import("@/core/artifacts/hash");
  const { upsertArtifact } = await import("@/core/persistence/artifacts.repo");
  const { db } = await import("@/core/persistence/db");

  const { model, ownerId } = await resolveModel(projectId);
  const content = await generateNode(model, buildArtifactPrompt(type as GenType, sourceText));
  return upsertArtifact(db, {
    ownerId,
    projectId,
    sourceNodeId,
    type,
    content,
    sourceHash: hashSource(sourceText),
  });
}

export async function listNodeArtifactsAction(projectId: string, sourceNodeId: string) {
  const { db } = await import("@/core/persistence/db");
  const { syncCurrentUser } = await import("@/lib/auth");
  const { listArtifactsByNode } = await import("@/core/persistence/artifacts.repo");
  const ownerId = await syncCurrentUser();
  return listArtifactsByNode(db, { ownerId, projectId, sourceNodeId });
}
