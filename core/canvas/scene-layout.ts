import { SIZE_PX, type Scene, type SceneNode, type SceneNodeType } from "@/core/ai/scene";
import { DEVICE_ASPECT } from "@/core/ai/wireframe";

/** Canvas node type used to render each scene type. */
const NODE_TYPE: Record<SceneNodeType, string> = {
  concept: "aiNode",
  note: "noteNode",
  group: "groupNode",
  table: "tableNode",
  code: "codeNode",
  image: "imageNode",
  video: "videoNode",
  wireframe: "wireframeNode",
  shape: "shapeNode",
};

const GAP = 40;
const GROUP_PAD = 24;
/** Room for the group's title chip above its children. */
const GROUP_HEADER = 34;
/** Wrap a row once it passes this, so wide scenes stay readable. */
const MAX_ROW_WIDTH = 1280;

export type PlacedNode = {
  id: string;
  type: string;
  position: { x: number; y: number };
  width: number;
  height: number;
  parentId?: string;
  source: SceneNode;
};

export type PlacedEdge = {
  source: string;
  target: string;
  label?: string;
  directed: boolean;
};

export type SceneLayout = { nodes: PlacedNode[]; edges: PlacedEdge[] };

type Box = { width: number; height: number };
type Placement = { offsets: { x: number; y: number }[]; width: number; height: number };

/** Shifts a placement so nothing sits at a negative coordinate. */
function normalize(offsets: { x: number; y: number }[], boxes: Box[]): Placement {
  if (offsets.length === 0) return { offsets, width: 0, height: 0 };
  const minX = Math.min(...offsets.map((o) => o.x));
  const minY = Math.min(...offsets.map((o) => o.y));
  const shifted = offsets.map((o) => ({ x: o.x - minX, y: o.y - minY }));
  return {
    offsets: shifted,
    width: Math.max(...shifted.map((o, i) => o.x + boxes[i].width)),
    height: Math.max(...shifted.map((o, i) => o.y + boxes[i].height)),
  };
}

/** First node at the centre, the rest on a ring around it. */
function radial(boxes: Box[]): Placement {
  if (boxes.length <= 1) return normalize(boxes.map(() => ({ x: 0, y: 0 })), boxes);
  const spokes = boxes.length - 1;
  const span = Math.max(...boxes.map((b) => Math.max(b.width, b.height)));

  // Two constraints: adjacent spokes are a chord apart (2r·sin(π/n)), and no
  // spoke may reach the centre node.
  const chordRadius = spokes > 1 ? (span + GAP) / (2 * Math.sin(Math.PI / spokes)) : 0;
  const centreRadius = (Math.max(boxes[0].width, boxes[0].height) + span) / 2 + GAP;
  const radius = Math.max(chordRadius, centreRadius);

  const offsets = boxes.map((box, i) => {
    if (i === 0) return { x: -box.width / 2, y: -box.height / 2 };
    const angle = ((i - 1) / spokes) * Math.PI * 2 - Math.PI / 2;
    return {
      x: Math.cos(angle) * radius - box.width / 2,
      y: Math.sin(angle) * radius - box.height / 2,
    };
  });
  return normalize(offsets, boxes);
}

/** Layers by distance from a root, children centred under their row. */
function hierarchy(boxes: Box[], ids: string[], edges: { from: string; to: string }[]): Placement {
  const index = new Map(ids.map((id, i) => [id, i]));
  const hasParent = new Set(edges.filter((e) => index.has(e.to)).map((e) => e.to));

  const depth = new Array(ids.length).fill(0);
  const queue = ids.map((id, i) => (hasParent.has(id) ? -1 : i)).filter((i) => i >= 0);
  const seen = new Set(queue);
  // Anything unreachable (a cycle, or an island) stays at depth 0.
  while (queue.length > 0) {
    const i = queue.shift()!;
    for (const edge of edges) {
      if (edge.from !== ids[i]) continue;
      const child = index.get(edge.to);
      if (child === undefined || seen.has(child)) continue;
      depth[child] = depth[i] + 1;
      seen.add(child);
      queue.push(child);
    }
  }

  const rows = new Map<number, number[]>();
  depth.forEach((d, i) => {
    const row = rows.get(d);
    if (row) row.push(i);
    else rows.set(d, [i]);
  });

  const offsets = new Array(ids.length).fill(null).map(() => ({ x: 0, y: 0 }));
  const widths = [...rows.values()].map((row) =>
    row.reduce((sum, i) => sum + boxes[i].width + GAP, -GAP),
  );
  const widest = Math.max(...widths, 0);

  let y = 0;
  [...rows.entries()]
    .sort((a, b) => a[0] - b[0])
    .forEach(([, row], r) => {
      let x = (widest - widths[r]) / 2;
      let tallest = 0;
      for (const i of row) {
        offsets[i] = { x, y };
        x += boxes[i].width + GAP;
        tallest = Math.max(tallest, boxes[i].height);
      }
      y += tallest + GAP * 2;
    });

  return normalize(offsets, boxes);
}

/** Four quadrants, filled in reading order, with a gutter for the axes. */
function quadrants(boxes: Box[]): Placement {
  const perCell = Math.ceil(boxes.length / 4) || 1;
  const cellWidth = Math.max(...boxes.map((b) => b.width)) + GAP;
  const cellHeight = Math.max(...boxes.map((b) => b.height)) + GAP;
  const gutter = GAP * 2;

  const offsets = boxes.map((_, i) => {
    const cell = Math.min(Math.floor(i / perCell), 3);
    const withinCell = i - cell * perCell;
    return {
      x: (cell % 2) * (cellWidth * perCell + gutter) + withinCell * cellWidth,
      y: Math.floor(cell / 2) * (cellHeight + gutter),
    };
  });
  return normalize(offsets, boxes);
}

/** One horizontal spine, alternating above and below it. */
function spine(boxes: Box[]): Placement {
  const tallest = Math.max(...boxes.map((b) => b.height));
  let x = 0;
  const offsets = boxes.map((box, i) => {
    const offset = { x, y: i % 2 === 0 ? 0 : tallest + GAP * 2 };
    x += box.width + GAP;
    return offset;
  });
  return normalize(offsets, boxes);
}

function boxOf(node: SceneNode): { width: number; height: number } {
  const base = SIZE_PX[node.size];
  // A phone screen drawn in a landscape box reads wrong, so a wireframe that
  // names its device is given that device's proportions.
  const device = node.wireframe?.device;
  if (node.type === "wireframe" && device) {
    return { width: base.width, height: Math.round(base.width / DEVICE_ASPECT[device]) };
  }
  return base;
}

/**
 * Flows boxes left to right, wrapping at maxWidth. Returns each box's offset
 * plus the total extent, so a caller can size a container around them.
 */
function flow(
  items: { width: number; height: number }[],
  maxWidth: number,
): { offsets: { x: number; y: number }[]; width: number; height: number } {
  const offsets: { x: number; y: number }[] = [];
  let x = 0;
  let y = 0;
  let rowHeight = 0;
  let widest = 0;

  for (const item of items) {
    if (x > 0 && x + item.width > maxWidth) {
      x = 0;
      y += rowHeight + GAP;
      rowHeight = 0;
    }
    offsets.push({ x, y });
    x += item.width + GAP;
    rowHeight = Math.max(rowHeight, item.height);
    widest = Math.max(widest, x - GAP);
  }

  return { offsets, width: widest, height: y + rowHeight };
}

/** Arranges the top level according to the board genre the model chose. */
function placeRoots(scene: Scene, roots: SceneNode[], boxes: Box[]): Placement {
  if (boxes.length === 0) return { offsets: [], width: 0, height: 0 };
  switch (scene.layout) {
    case "mindmap":
      return radial(boxes);
    case "tree":
      return hierarchy(boxes, roots.map((n) => n.id), scene.edges);
    case "matrix":
      return quadrants(boxes);
    case "timeline":
      return spine(boxes);
    default:
      return flow(boxes, MAX_ROW_WIDTH);
  }
}

/**
 * Turns a parsed scene into positioned canvas nodes. Group members are laid out
 * inside their group and sized to fit; the top level follows the scene's genre.
 *
 * Child positions are relative to the parent, which is what React Flow expects.
 */
export function layoutScene(scene: Scene, origin = { x: 0, y: 0 }): SceneLayout {
  const byId = new Map(scene.nodes.map((n) => [n.id, n]));
  const childrenOf = new Map<string, SceneNode[]>();
  const roots: SceneNode[] = [];

  for (const node of scene.nodes) {
    // Only a real group can hold children; anything else is treated as a peer.
    const parent = node.parent ? byId.get(node.parent) : undefined;
    if (parent && parent.type === "group") {
      const bucket = childrenOf.get(parent.id);
      if (bucket) bucket.push(node);
      else childrenOf.set(parent.id, [node]);
    } else {
      roots.push(node);
    }
  }

  const placed: PlacedNode[] = [];

  // Size each group around its children before the top level is arranged.
  const rootBoxes = roots.map((node) => {
    const kids = childrenOf.get(node.id) ?? [];
    if (node.type !== "group" || kids.length === 0) return boxOf(node);
    const inner = flow(kids.map(boxOf), MAX_ROW_WIDTH);
    return {
      width: Math.max(boxOf(node).width, inner.width + GROUP_PAD * 2),
      height: Math.max(boxOf(node).height, inner.height + GROUP_PAD * 2 + GROUP_HEADER),
    };
  });

  const top = placeRoots(scene, roots, rootBoxes);

  roots.forEach((node, i) => {
    placed.push({
      id: node.id,
      type: NODE_TYPE[node.type],
      position: { x: origin.x + top.offsets[i].x, y: origin.y + top.offsets[i].y },
      width: rootBoxes[i].width,
      height: rootBoxes[i].height,
      source: node,
    });

    const kids = childrenOf.get(node.id) ?? [];
    if (kids.length === 0) return;
    const inner = flow(kids.map(boxOf), rootBoxes[i].width - GROUP_PAD * 2);
    kids.forEach((kid, k) => {
      const box = boxOf(kid);
      placed.push({
        id: kid.id,
        type: NODE_TYPE[kid.type],
        position: {
          x: GROUP_PAD + inner.offsets[k].x,
          y: GROUP_PAD + GROUP_HEADER + inner.offsets[k].y,
        },
        width: box.width,
        height: box.height,
        parentId: node.id,
        source: kid,
      });
    });
  });

  const edges: PlacedEdge[] = scene.edges.map((e) => ({
    source: e.from,
    target: e.to,
    // The optional second line rides under the label, as in numbered diagrams.
    label: [e.label, e.note].filter(Boolean).join(" — ") || undefined,
    directed: e.directed,
  }));

  return { nodes: placed, edges };
}
