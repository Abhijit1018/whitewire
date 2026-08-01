import type {
  Bbox,
  Point,
  RecognizedStroke,
  SketchConnection,
  SketchGraph,
  SketchShape,
  TextCluster,
} from "./types";

/** How far a connector endpoint may sit from a shape and still attach to it. */
const ATTACH_TOLERANCE = 28;
/** A separately-drawn arrowhead is small and sits near a line's endpoint. */
const HEAD_MAX_SIZE = 44;
const HEAD_MAX_DISTANCE = 26;

const CLOSED_KINDS = new Set(["rect", "ellipse", "diamond"]);

export function distanceToBbox(p: Point, box: Bbox): number {
  const dx = Math.max(box.x - p[0], 0, p[0] - (box.x + box.w));
  const dy = Math.max(box.y - p[1], 0, p[1] - (box.y + box.h));
  return Math.hypot(dx, dy);
}

export function centroid(box: Bbox): Point {
  return [box.x + box.w / 2, box.y + box.h / 2];
}

export function contains(outer: Bbox, inner: Bbox): boolean {
  return (
    inner.x >= outer.x &&
    inner.y >= outer.y &&
    inner.x + inner.w <= outer.x + outer.w &&
    inner.y + inner.h <= outer.y + outer.h
  );
}

/**
 * Many people draw the arrowhead as its own stroke. Any small scribble sitting
 * on a line's endpoint is treated as that line's head — the line becomes a
 * directed arrow pointing at it, and the scribble is consumed so OCR never
 * sees it.
 */
export function promoteArrowHeads(strokes: RecognizedStroke[]): {
  strokes: RecognizedStroke[];
  consumedIds: Set<string>;
} {
  const consumedIds = new Set<string>();
  const heads = strokes.filter(
    (s) =>
      s.kind === "scribble" &&
      Math.max(s.bbox.w, s.bbox.h) <= HEAD_MAX_SIZE &&
      Math.max(s.bbox.w, s.bbox.h) > 0,
  );

  const updated = strokes.map((stroke) => {
    if (stroke.kind !== "line") return stroke;
    for (const head of heads) {
      if (consumedIds.has(head.id)) continue;
      const headCenter = centroid(head.bbox);
      const atEnd = Math.hypot(headCenter[0] - stroke.end[0], headCenter[1] - stroke.end[1]);
      const atStart = Math.hypot(headCenter[0] - stroke.start[0], headCenter[1] - stroke.start[1]);
      if (Math.min(atEnd, atStart) > HEAD_MAX_DISTANCE) continue;

      consumedIds.add(head.id);
      // The head marks the target, so flip the stroke if it landed on the start.
      const flipped = atStart < atEnd;
      return {
        ...stroke,
        kind: "arrow" as const,
        start: flipped ? stroke.end : stroke.start,
        end: flipped ? stroke.start : stroke.end,
      };
    }
    return stroke;
  });

  return { strokes: updated, consumedIds };
}

function nearestShape(p: Point, shapes: SketchShape[]): SketchShape | null {
  let best: SketchShape | null = null;
  let bestDistance = Infinity;
  for (const shape of shapes) {
    const d = distanceToBbox(p, shape.bbox);
    if (d < bestDistance) {
      bestDistance = d;
      best = shape;
    }
  }
  return bestDistance <= ATTACH_TOLERANCE ? best : null;
}

/** Assigns each label to the smallest shape that encloses its centre. */
function labelShapes(shapes: SketchShape[], clusters: TextCluster[]): TextCluster[] {
  const loose: TextCluster[] = [];
  for (const cluster of clusters) {
    const centre = centroid(cluster.bbox);
    const holders = shapes
      .filter((s) => distanceToBbox(centre, s.bbox) === 0)
      .sort((a, b) => a.bbox.w * a.bbox.h - b.bbox.w * b.bbox.h);
    const holder = holders[0];
    if (!holder) {
      loose.push(cluster);
      continue;
    }
    holder.label = holder.label ? `${holder.label} ${cluster.text}`.trim() : cluster.text;
  }
  return loose;
}

/** Only the innermost enclosing shape counts as a parent. */
function findContainment(shapes: SketchShape[]): { parentId: string; childId: string }[] {
  const pairs: { parentId: string; childId: string }[] = [];
  for (const child of shapes) {
    const parents = shapes
      .filter((s) => s.id !== child.id && contains(s.bbox, child.bbox))
      .sort((a, b) => a.bbox.w * a.bbox.h - b.bbox.w * b.bbox.h);
    if (parents[0]) pairs.push({ parentId: parents[0].id, childId: child.id });
  }
  return pairs;
}

export function buildGraph(strokes: RecognizedStroke[], clusters: TextCluster[]): SketchGraph {
  const shapes: SketchShape[] = strokes
    .filter((s) => CLOSED_KINDS.has(s.kind))
    .map((s, i) => ({
      id: `box${i + 1}`,
      kind: s.kind as SketchShape["kind"],
      bbox: s.bbox,
      confidence: s.confidence,
      label: "",
    }));

  const looseClusters = labelShapes(shapes, clusters);

  const connections: SketchConnection[] = [];
  for (const stroke of strokes) {
    if (stroke.kind !== "arrow" && stroke.kind !== "line") continue;
    const from = nearestShape(stroke.start, shapes);
    const to = nearestShape(stroke.end, shapes);
    // A connector with a loose end tells us nothing about structure.
    if (!from || !to || from.id === to.id) continue;
    connections.push({ fromId: from.id, toId: to.id, directed: stroke.kind === "arrow" });
  }

  return {
    shapes,
    connections,
    containment: findContainment(shapes),
    looseLabels: looseClusters.map((c) => c.text).filter((t) => t.length > 0),
  };
}
