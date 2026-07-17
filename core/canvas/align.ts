export type AlignEdge = "left" | "center-h" | "right" | "top" | "middle" | "bottom";
export type DistributeAxis = "h" | "v";

/** Minimal node shape the align/distribute math needs. */
export type AlignNode = { id: string; x: number; y: number; width: number; height: number };

/** Per-id position patch (only the axis that moved is present). */
export type PosPatch = Record<string, { x?: number; y?: number }>;

/**
 * Align nodes to a shared edge or center of the selection's bounding box.
 * Returns a patch per node; nodes already on the target line get a no-op patch.
 * Fewer than 2 nodes → empty (nothing to align against).
 */
export function computeAlign(nodes: AlignNode[], edge: AlignEdge): PosPatch {
  if (nodes.length < 2) return {};
  const minX = Math.min(...nodes.map((n) => n.x));
  const maxRight = Math.max(...nodes.map((n) => n.x + n.width));
  const minY = Math.min(...nodes.map((n) => n.y));
  const maxBottom = Math.max(...nodes.map((n) => n.y + n.height));
  const centerX = (minX + maxRight) / 2;
  const centerY = (minY + maxBottom) / 2;

  const patch: PosPatch = {};
  for (const n of nodes) {
    switch (edge) {
      case "left": patch[n.id] = { x: minX }; break;
      case "right": patch[n.id] = { x: maxRight - n.width }; break;
      case "center-h": patch[n.id] = { x: centerX - n.width / 2 }; break;
      case "top": patch[n.id] = { y: minY }; break;
      case "bottom": patch[n.id] = { y: maxBottom - n.height }; break;
      case "middle": patch[n.id] = { y: centerY - n.height / 2 }; break;
    }
  }
  return patch;
}

/**
 * Distribute nodes so their centers are evenly spaced between the first and
 * last node along the axis. The two extreme nodes stay put. Fewer than 3
 * nodes → empty (nothing to redistribute).
 */
export function computeDistribute(nodes: AlignNode[], axis: DistributeAxis): PosPatch {
  if (nodes.length < 3) return {};
  const center = (n: AlignNode) => (axis === "h" ? n.x + n.width / 2 : n.y + n.height / 2);
  const sorted = [...nodes].sort((a, b) => center(a) - center(b));
  const first = center(sorted[0]);
  const last = center(sorted[sorted.length - 1]);
  const step = (last - first) / (sorted.length - 1);

  const patch: PosPatch = {};
  sorted.forEach((n, i) => {
    if (i === 0 || i === sorted.length - 1) return; // extremes stay fixed
    const c = first + i * step;
    patch[n.id] = axis === "h" ? { x: c - n.width / 2 } : { y: c - n.height / 2 };
  });
  return patch;
}
