import { classifyStroke } from "./classify";
import { clusterText } from "./cluster";
import { promoteArrowHeads } from "./graph";
import type { RecognizedStroke, TextCluster } from "./types";

export * from "./types";
export { classifyStroke, bboxOf, simplify, polygonArea, isClosed, pathLength } from "./classify";
export { clusterText, bboxGap, mergeBboxes } from "./cluster";
export { buildGraph, promoteArrowHeads, contains, distanceToBbox, centroid } from "./graph";
export { describeGraph, buildSketchGraphPrompt } from "./serialize";
export { toAbsoluteStrokes, type DrawNodeLike, type AbsoluteStroke } from "./collect";

export type StrokeInput = { id: string; points: number[][] };

/**
 * Turns raw pen strokes into classified shapes plus the handwriting clusters
 * that still need reading. Callers run OCR over the clusters, then hand both
 * back to `buildGraph`.
 */
export function recognizeStrokes(input: StrokeInput[]): {
  strokes: RecognizedStroke[];
  clusters: TextCluster[];
} {
  const classified = input.map((s) => classifyStroke(s.id, s.points));
  const { strokes, consumedIds } = promoteArrowHeads(classified);
  // Arrowheads look like scribbles; drop them before clustering so OCR is not
  // handed a chevron to read as a word.
  const clusters = clusterText(strokes.filter((s) => !consumedIds.has(s.id)));
  return { strokes, clusters };
}
