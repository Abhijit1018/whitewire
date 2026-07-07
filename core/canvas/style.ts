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
