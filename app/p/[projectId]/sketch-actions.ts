"use server";

import type { BlueprintNode } from "@/core/ai/blueprint";
import type { SketchPlan } from "@/core/ai/sketch-plan";
import { toActionFailure, type ModelErrorCode } from "@/core/ai/model-errors";

type SketchResult = {
  nodes?: BlueprintNode[];
  edges?: [number, number][];
  error?: string;
  code?: ModelErrorCode | "failed";
};

type SketchPlanResult = {
  plan?: SketchPlan;
  error?: string;
  code?: ModelErrorCode | "failed";
};

async function logSketch(projectId: string, ownerId: string, prompt: string, output: string) {
  try {
    const { db } = await import("@/core/persistence/db");
    const { logPrompt } = await import("@/core/persistence/versions.repo");
    await logPrompt(db, { ownerId, projectId, kind: "sketch", prompt, output });
  } catch {
    // history logging is best-effort — never block generation
  }
}

/**
 * Interprets a sketch that the browser has already reduced to geometry.
 * Because the input is plain text, this runs on the user's ordinary active
 * model — no vision capability required.
 */
export async function interpretSketchGraphAction(
  projectId: string,
  description: string,
): Promise<SketchPlanResult> {
  if (!description.trim()) return { error: "Nothing recognizable in the drawing.", code: "failed" };
  try {
    const { resolveModel } = await import("@/core/ai/resolve-model");
    const { generateNode } = await import("@/core/ai/generate");
    const { buildSketchPlanPrompt, parseSketchPlan } = await import("@/core/ai/sketch-plan");
    const { model, ownerId } = await resolveModel(projectId, "reasoning");

    const raw = await generateNode(model, buildSketchPlanPrompt(description));
    await logSketch(projectId, ownerId, description, raw);

    const plan = parseSketchPlan(raw);
    if (!plan) {
      return {
        error: "The model didn't return a usable result. Try drawing clearer shapes.",
        code: "failed",
      };
    }
    return { plan };
  } catch (e) {
    return toActionFailure(e, "Could not read the sketch");
  }
}

/**
 * Vision fallback, kept for imported photos and screenshots where there are no
 * vector strokes to recover geometry from.
 */
export async function interpretSketchAction(
  projectId: string,
  imageDataUrl: string,
): Promise<SketchResult> {
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
    await logSketch(projectId, ownerId, "[sketch image]", raw);

    const bp = parseBlueprint(raw);
    if (bp.nodes.length === 0) {
      return {
        error:
          "Couldn't read the image. Set a vision-capable model active (e.g. gpt-4o, claude-3-5-sonnet, gemini) — text-only models can't see images.",
        code: "failed",
      };
    }
    return { nodes: bp.nodes, edges: bp.edges };
  } catch (e) {
    return toActionFailure(e, "Could not read the image");
  }
}
