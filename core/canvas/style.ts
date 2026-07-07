export type ShapeStyle = {
  stroke: string;
  fill: string;
  strokeWidth: number;
  strokeStyle: "solid" | "dashed" | "dotted";
  sloppiness: 0 | 1 | 2;
  edges: "sharp" | "round";
  opacity: number;
  fontSize?: number;
};

export const DEFAULT_STYLE: ShapeStyle = {
  stroke: "#1e1e1e",
  fill: "transparent",
  strokeWidth: 2,
  strokeStyle: "solid",
  sloppiness: 1,
  edges: "round",
  opacity: 1,
};

export function dashArray(strokeStyle: ShapeStyle["strokeStyle"], strokeWidth: number): number[] {
  if (strokeStyle === "dashed") return [strokeWidth * 4, strokeWidth * 2];
  if (strokeStyle === "dotted") return [strokeWidth, strokeWidth * 2];
  return [];
}

export function penSize(strokeWidth: ShapeStyle["strokeWidth"]): number {
  return strokeWidth === 1 ? 4 : strokeWidth === 2 ? 7 : 12;
}
