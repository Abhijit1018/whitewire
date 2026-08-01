/** Minimal shape of a canvas node, so this stays independent of the store. */
export type DrawNodeLike = {
  id: string;
  type?: string;
  position: { x: number; y: number };
  data: { points?: number[][]; color?: string; size?: number };
};

export type AbsoluteStroke = {
  id: string;
  points: number[][];
  color?: string;
  size?: number;
};

/**
 * Pulls pen strokes off the board and rebases their points from node-local to
 * canvas coordinates, which is what the recognizer reasons in.
 */
export function toAbsoluteStrokes(nodes: DrawNodeLike[]): AbsoluteStroke[] {
  return nodes
    .filter((n) => n.type === "drawNode" && (n.data.points?.length ?? 0) > 1)
    .map((n) => ({
      id: n.id,
      points: n.data.points!.map(([x, y]) => [n.position.x + x, n.position.y + y]),
      color: n.data.color,
      size: n.data.size,
    }));
}
