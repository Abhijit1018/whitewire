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

/**
 * Turns a parsed scene into positioned canvas nodes. Group members are laid out
 * inside their group and sized to fit; everything else flows at the top level.
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

  const top = flow(rootBoxes, MAX_ROW_WIDTH);

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
