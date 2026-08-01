import {
  recognizeStrokes,
  buildGraph,
  describeGraph,
  toAbsoluteStrokes,
} from "@/core/canvas/recognize";
import { readTextClusters } from "./ocr";
import type { AiNode } from "@/core/state/workspace-store";

/**
 * Turns the board's pen strokes into a text description of their geometry.
 * Runs entirely in the browser: shape recognition is pure maths and the
 * handwriting pass is local OCR, so no vision model is involved.
 *
 * Returns null when there is nothing recognizable to describe.
 */
export async function describeSketch(nodes: AiNode[]): Promise<string | null> {
  const strokes = toAbsoluteStrokes(nodes);
  if (strokes.length === 0) return null;

  const { strokes: recognized, clusters } = recognizeStrokes(strokes);
  const labelled = await readTextClusters(clusters, strokes);
  const description = describeGraph(buildGraph(recognized, labelled));
  return description || null;
}
