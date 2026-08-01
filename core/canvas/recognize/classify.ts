import type { Bbox, Point, RecognizedStroke, ShapeKind } from "./types";

/** A stroke counts as closed when its endpoints nearly meet, relative to its own length. */
const CLOSED_GAP_RATIO = 0.28;
/** Below this the stroke is treated as a dot, not a shape. */
const MIN_DIAGONAL = 6;
/**
 * A closed stroke must be this big to count as a drawn shape. Without a floor,
 * stray flecks a few pixels across become "rectangles" and then become nodes.
 */
const MIN_SHAPE_SIDE = 14;
const MIN_SHAPE_AREA = 400;
/** Fill ratio bands. A perfect rect is 1.0, ellipse 0.785, diamond 0.5. */
const RECT_MIN = 0.87;
const ELLIPSE_MIN = 0.64;
const DIAMOND_MIN = 0.36;
/** Corner count that lets a slightly-rounded box still read as a rect. */
const RECT_CORNER_MAX = 6;
const RECT_TIEBREAK_MIN = 0.8;
/** How straight an open stroke's shaft must be to be a line rather than a scribble. */
const STRAIGHT_MIN = 0.85;
/** Backtracking past the far end this far (relative to shaft length) reads as an arrowhead. */
const ARROWHEAD_MIN = 0.08;

export function bboxOf(points: Point[]): Bbox {
  if (points.length === 0) return { x: 0, y: 0, w: 0, h: 0 };
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const [x, y] of points) {
    minX = Math.min(minX, x);
    minY = Math.min(minY, y);
    maxX = Math.max(maxX, x);
    maxY = Math.max(maxY, y);
  }
  return { x: minX, y: minY, w: maxX - minX, h: maxY - minY };
}

export function distance(a: Point, b: Point): number {
  return Math.hypot(a[0] - b[0], a[1] - b[1]);
}

export function pathLength(points: Point[]): number {
  let total = 0;
  for (let i = 1; i < points.length; i += 1) total += distance(points[i - 1], points[i]);
  return total;
}

/** Shoelace area of the polygon the stroke traces. */
export function polygonArea(points: Point[]): number {
  if (points.length < 3) return 0;
  let sum = 0;
  for (let i = 0; i < points.length; i += 1) {
    const [x0, y0] = points[i];
    const [x1, y1] = points[(i + 1) % points.length];
    sum += x0 * y1 - x1 * y0;
  }
  return Math.abs(sum) / 2;
}

function perpendicularDistance(p: Point, a: Point, b: Point): number {
  const dx = b[0] - a[0];
  const dy = b[1] - a[1];
  const len = Math.hypot(dx, dy);
  if (len === 0) return distance(p, a);
  return Math.abs(dy * (p[0] - a[0]) - dx * (p[1] - a[1])) / len;
}

/** Ramer–Douglas–Peucker: drops points that don't change the stroke's shape. */
export function simplify(points: Point[], epsilon: number): Point[] {
  if (points.length < 3 || epsilon <= 0) return [...points];
  const first = points[0];
  const last = points[points.length - 1];

  let maxDist = 0;
  let index = 0;
  for (let i = 1; i < points.length - 1; i += 1) {
    const d = perpendicularDistance(points[i], first, last);
    if (d > maxDist) {
      maxDist = d;
      index = i;
    }
  }

  if (maxDist <= epsilon) return [first, last];
  const left = simplify(points.slice(0, index + 1), epsilon);
  const right = simplify(points.slice(index), epsilon);
  return [...left.slice(0, -1), ...right];
}

export function isClosed(points: Point[]): boolean {
  const length = pathLength(points);
  if (length === 0) return false;
  return distance(points[0], points[points.length - 1]) / length < CLOSED_GAP_RATIO;
}

function confidenceFor(kind: ShapeKind, ratio: number): number {
  const ideal: Partial<Record<ShapeKind, number>> = {
    rect: 1,
    ellipse: 0.785,
    diamond: 0.5,
  };
  const target = ideal[kind];
  if (target === undefined) return 0.5;
  return Math.max(0.3, Math.min(1, 1 - Math.abs(ratio - target) / 0.25));
}

function classifyClosed(points: Point[], bbox: Bbox): { kind: ShapeKind; confidence: number } {
  const bboxArea = bbox.w * bbox.h;
  if (bboxArea === 0) return { kind: "scribble", confidence: 0.3 };
  // Too small to be a deliberate shape — treat it as ink, not structure.
  if (Math.min(bbox.w, bbox.h) < MIN_SHAPE_SIDE || bboxArea < MIN_SHAPE_AREA) {
    return { kind: "scribble", confidence: 0.4 };
  }

  const ratio = polygonArea(points) / bboxArea;
  const corners = simplify(points, pathLength(points) * 0.04).length;

  // Fill ratio separates the three closed shapes cleanly, because each has a
  // characteristic share of its own bounding box.
  let kind: ShapeKind;
  if (ratio >= RECT_MIN) kind = "rect";
  else if (ratio >= RECT_TIEBREAK_MIN && corners <= RECT_CORNER_MAX) kind = "rect";
  else if (ratio >= ELLIPSE_MIN) kind = "ellipse";
  else if (ratio >= DIAMOND_MIN) kind = "diamond";
  else kind = "scribble";

  return { kind, confidence: confidenceFor(kind, ratio) };
}

/**
 * For an open stroke, finds the point farthest from the start — the tip of the
 * shaft. Anything drawn after it is a candidate arrowhead.
 */
function farthestFromStart(points: Point[]): number {
  let index = 0;
  let best = -1;
  for (let i = 1; i < points.length; i += 1) {
    const d = distance(points[0], points[i]);
    if (d > best) {
      best = d;
      index = i;
    }
  }
  return index;
}

function classifyOpen(points: Point[]): {
  kind: ShapeKind;
  confidence: number;
  end: Point;
} {
  const tipIndex = farthestFromStart(points);
  const tip = points[tipIndex];
  const shaft = points.slice(0, tipIndex + 1);
  const shaftLength = pathLength(shaft);
  const shaftSpan = distance(points[0], tip);
  if (shaftLength === 0) return { kind: "scribble", confidence: 0.3, end: tip };

  const straightness = shaftSpan / shaftLength;
  if (straightness < STRAIGHT_MIN) {
    return { kind: "scribble", confidence: 0.4, end: points[points.length - 1] };
  }

  // A single-stroke arrow doubles back from the tip to draw its barbs.
  const tail = points.slice(tipIndex + 1);
  const backtrack = tail.reduce((max, p) => Math.max(max, shaftSpan - distance(points[0], p)), 0);
  const hasHead = tail.length > 0 && backtrack > shaftSpan * ARROWHEAD_MIN;

  return {
    kind: hasHead ? "arrow" : "line",
    confidence: Math.min(1, straightness),
    end: tip,
  };
}

/** Classifies one freehand stroke from its raw points. */
export function classifyStroke(id: string, rawPoints: number[][]): RecognizedStroke {
  const points = rawPoints.map(([x, y]) => [x, y] as Point);
  const bbox = bboxOf(points);
  const fallback: RecognizedStroke = {
    id,
    kind: "scribble",
    bbox,
    confidence: 0.3,
    start: points[0] ?? [0, 0],
    end: points[points.length - 1] ?? [0, 0],
  };

  if (points.length < 3) return fallback;
  if (Math.hypot(bbox.w, bbox.h) < MIN_DIAGONAL) return fallback;

  if (isClosed(points)) {
    const { kind, confidence } = classifyClosed(points, bbox);
    return { ...fallback, kind, confidence };
  }

  const { kind, confidence, end } = classifyOpen(points);
  return { ...fallback, kind, confidence, end };
}
