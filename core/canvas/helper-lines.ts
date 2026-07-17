/** A node reduced to the bounds the alignment math needs (x/y = top-left). */
export type HLNode = { id: string; x: number; y: number; width: number; height: number };

export type HelperLineResult = {
  /** x of the vertical guide line, if the drag aligned on an x edge/center. */
  vertical?: number;
  /** y of the horizontal guide line, if the drag aligned on a y edge/center. */
  horizontal?: number;
  /** snapped top-left x for the dragged node (present iff `vertical` is). */
  snapX?: number;
  /** snapped top-left y for the dragged node (present iff `horizontal` is). */
  snapY?: number;
};

/**
 * Given the dragged node's current bounds and the other nodes, find the nearest
 * edge/center alignment within `distance` px on each axis and return the guide
 * line position plus the snapped top-left coordinate. Pure — no DOM.
 *
 * Vertical guides match left/right/center-x; horizontal guides match
 * top/bottom/center-y. The closest match on each axis wins independently.
 */
export function getHelperLines(dragged: HLNode, others: HLNode[], distance = 5): HelperLineResult {
  const a = {
    left: dragged.x, right: dragged.x + dragged.width, cx: dragged.x + dragged.width / 2,
    top: dragged.y, bottom: dragged.y + dragged.height, cy: dragged.y + dragged.height / 2,
  };

  let vDist = distance;
  let hDist = distance;
  const res: HelperLineResult = {};

  for (const o of others) {
    if (o.id === dragged.id) continue;
    const b = {
      left: o.x, right: o.x + o.width, cx: o.x + o.width / 2,
      top: o.y, bottom: o.y + o.height, cy: o.y + o.height / 2,
    };

    // Vertical guides (snap x). [draggedEdge, targetLineX]
    const vPairs: [number, number][] = [
      [a.left, b.left], [a.right, b.right], [a.left, b.right], [a.right, b.left], [a.cx, b.cx],
    ];
    for (const [aEdge, lineX] of vPairs) {
      const d = Math.abs(aEdge - lineX);
      if (d < vDist) {
        vDist = d;
        res.vertical = lineX;
        res.snapX = dragged.x + (lineX - aEdge);
      }
    }

    // Horizontal guides (snap y).
    const hPairs: [number, number][] = [
      [a.top, b.top], [a.bottom, b.bottom], [a.top, b.bottom], [a.bottom, b.top], [a.cy, b.cy],
    ];
    for (const [aEdge, lineY] of hPairs) {
      const d = Math.abs(aEdge - lineY);
      if (d < hDist) {
        hDist = d;
        res.horizontal = lineY;
        res.snapY = dragged.y + (lineY - aEdge);
      }
    }
  }

  return res;
}
