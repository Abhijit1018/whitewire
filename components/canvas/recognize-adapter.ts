import {
  recognizeStrokes,
  buildGraph,
  describeGraph,
  toAbsoluteStrokes,
  type Bbox,
} from "@/core/canvas/recognize";
import { readTextClusters } from "./ocr";
import type { AiNode } from "@/core/state/workspace-store";

export type SketchReading = {
  /** Text description of the geometry, for the model. */
  description: string;
  /** Recognized shapes in the same order the description lists them. */
  shapeBoxes: Bbox[];
  /** Bounding box of the whole drawing, in canvas coordinates. */
  bounds: Bbox;
  /** Ids of the stroke nodes this reading came from, so they can be replaced. */
  strokeIds: string[];
};

function unionOf(boxes: Bbox[]): Bbox {
  const minX = Math.min(...boxes.map((b) => b.x));
  const minY = Math.min(...boxes.map((b) => b.y));
  const maxX = Math.max(...boxes.map((b) => b.x + b.w));
  const maxY = Math.max(...boxes.map((b) => b.y + b.h));
  return { x: minX, y: minY, w: maxX - minX, h: maxY - minY };
}

/**
 * Reads the board's pen strokes into geometry. Runs entirely in the browser:
 * shape recognition is pure maths and the handwriting pass is local OCR, so no
 * vision model is involved.
 *
 * Returns null when there is nothing recognizable to describe.
 */
export async function readSketch(nodes: AiNode[]): Promise<SketchReading | null> {
  const strokes = toAbsoluteStrokes(nodes);
  if (strokes.length === 0) return null;

  const { strokes: recognized, clusters } = recognizeStrokes(strokes);
  const labelled = await readTextClusters(clusters, strokes);
  const graph = buildGraph(recognized, labelled);
  const description = describeGraph(graph);
  if (!description) return null;

  return {
    description,
    shapeBoxes: graph.shapes.map((s) => s.bbox),
    bounds: unionOf(recognized.map((s) => s.bbox)),
    strokeIds: strokes.map((s) => s.id),
  };
}
