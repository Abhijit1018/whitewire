export type Pt = { x: number; y: number };
export type Rect = { x: number; y: number; width: number; height: number };

export function normalizeRect(a: Pt, b: Pt): Rect {
  const x = Math.min(a.x, b.x);
  const y = Math.min(a.y, b.y);
  return { x, y, width: Math.abs(b.x - a.x), height: Math.abs(b.y - a.y) };
}

export function rectFromDrag(anchor: Pt, current: Pt, square = false): Rect {
  if (!square) return normalizeRect(anchor, current);
  const dx = current.x - anchor.x;
  const dy = current.y - anchor.y;
  const size = Math.max(Math.abs(dx), Math.abs(dy));
  const corner = {
    x: anchor.x + Math.sign(dx || 1) * size,
    y: anchor.y + Math.sign(dy || 1) * size,
  };
  return normalizeRect(anchor, corner);
}
