import dagre from "@dagrejs/dagre";

export type Box = { id: string; x: number; y: number; w: number; h: number };
export type Edge = { from: string; to: string };
export type Positions = Record<string, { x: number; y: number }>;

export function tidyShapes(boxes: Box[], opts: { gap?: number } = {}): Positions {
  const gap = opts.gap ?? 40;
  if (boxes.length === 0) return {};
  const cols = Math.ceil(Math.sqrt(boxes.length));
  const cellW = Math.max(...boxes.map((b) => b.w)) + gap;
  const cellH = Math.max(...boxes.map((b) => b.h)) + gap;
  const originX = Math.min(...boxes.map((b) => b.x));
  const originY = Math.min(...boxes.map((b) => b.y));

  const ordered = [...boxes].sort((a, b) => (a.y - b.y) || (a.x - b.x) || (a.id < b.id ? -1 : 1));
  const pos: Positions = {};
  ordered.forEach((b, i) => {
    const col = i % cols;
    const row = Math.floor(i / cols);
    pos[b.id] = { x: originX + col * cellW, y: originY + row * cellH };
  });
  return pos;
}

export function layoutGraph(
  boxes: Box[],
  edges: Edge[],
  opts: { rankGap?: number; nodeGap?: number } = {},
): Positions {
  const g = new dagre.graphlib.Graph();
  g.setGraph({ rankdir: "TB", ranksep: opts.rankGap ?? 80, nodesep: opts.nodeGap ?? 60 });
  g.setDefaultEdgeLabel(() => ({}));

  const ids = new Set(boxes.map((b) => b.id));
  for (const b of boxes) g.setNode(b.id, { width: b.w, height: b.h });
  for (const e of edges) if (ids.has(e.from) && ids.has(e.to)) g.setEdge(e.from, e.to);

  dagre.layout(g);

  const pos: Positions = {};
  for (const b of boxes) {
    const n = g.node(b.id);
    pos[b.id] = { x: Math.round(n.x - b.w / 2), y: Math.round(n.y - b.h / 2) };
  }
  return pos;
}

export function cleanup(boxes: Box[], edges: Edge[]): Positions {
  const ids = new Set(boxes.map((b) => b.id));
  const connecting = edges.filter((e) => ids.has(e.from) && ids.has(e.to));
  return connecting.length > 0 ? layoutGraph(boxes, connecting) : tidyShapes(boxes);
}
