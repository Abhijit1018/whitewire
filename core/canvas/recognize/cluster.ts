import type { Bbox, RecognizedStroke, TextCluster } from "./types";

/** Strokes taller than this are drawings, not letters. */
const MAX_GLYPH_HEIGHT = 80;
/** Floor for the join distance, so tight little words still group. */
const MIN_JOIN_GAP = 18;
/** Letters within this multiple of their own height belong to the same label. */
const JOIN_GAP_RATIO = 1.4;

/** Gap between two boxes; 0 when they overlap. */
export function bboxGap(a: Bbox, b: Bbox): number {
  const dx = Math.max(0, Math.max(a.x - (b.x + b.w), b.x - (a.x + a.w)));
  const dy = Math.max(0, Math.max(a.y - (b.y + b.h), b.y - (a.y + a.h)));
  return Math.hypot(dx, dy);
}

export function mergeBboxes(boxes: Bbox[]): Bbox {
  const minX = Math.min(...boxes.map((b) => b.x));
  const minY = Math.min(...boxes.map((b) => b.y));
  const maxX = Math.max(...boxes.map((b) => b.x + b.w));
  const maxY = Math.max(...boxes.map((b) => b.y + b.h));
  return { x: minX, y: minY, w: maxX - minX, h: maxY - minY };
}

function median(values: number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.floor(sorted.length / 2)];
}

/**
 * Groups small scribbles into handwriting clusters, so OCR runs on whole words
 * instead of individual pen strokes.
 */
export function clusterText(strokes: RecognizedStroke[]): TextCluster[] {
  const glyphs = strokes.filter((s) => s.kind === "scribble" && s.bbox.h <= MAX_GLYPH_HEIGHT);
  if (glyphs.length === 0) return [];

  const joinGap = Math.max(MIN_JOIN_GAP, median(glyphs.map((g) => g.bbox.h)) * JOIN_GAP_RATIO);

  // Union-find over "close enough to be the same label".
  const parent = glyphs.map((_, i) => i);
  const find = (i: number): number => {
    while (parent[i] !== i) {
      parent[i] = parent[parent[i]];
      i = parent[i];
    }
    return i;
  };
  const union = (a: number, b: number) => {
    const ra = find(a);
    const rb = find(b);
    if (ra !== rb) parent[rb] = ra;
  };

  for (let i = 0; i < glyphs.length; i += 1) {
    for (let j = i + 1; j < glyphs.length; j += 1) {
      if (bboxGap(glyphs[i].bbox, glyphs[j].bbox) <= joinGap) union(i, j);
    }
  }

  const groups = new Map<number, RecognizedStroke[]>();
  glyphs.forEach((glyph, i) => {
    const root = find(i);
    const bucket = groups.get(root);
    if (bucket) bucket.push(glyph);
    else groups.set(root, [glyph]);
  });

  return [...groups.values()].map((members, i) => ({
    id: `text${i + 1}`,
    bbox: mergeBboxes(members.map((m) => m.bbox)),
    strokeIds: members.map((m) => m.id),
    text: "",
  }));
}
