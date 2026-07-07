"use client";

import type { NodeProps } from "@xyflow/react";
import type { AiNode as AiNodeType } from "@/core/state/workspace-store";
import { strokePath } from "./freehand";

export function DrawNode({ data, selected }: NodeProps<AiNodeType>) {
  const points = data.points ?? [];
  const color = data.style?.stroke ?? data.color ?? "#3f3f46";
  const size = data.size ?? 6;
  const opacity = data.style?.opacity ?? 1;
  const xs = points.map((p) => p[0]);
  const ys = points.map((p) => p[1]);
  const w = (xs.length ? Math.max(...xs) : 0) + size * 2;
  const h = (ys.length ? Math.max(...ys) : 0) + size * 2;

  return (
    <svg
      width={w}
      height={h}
      style={{ overflow: "visible", outline: selected ? "1px dashed var(--brand-accent)" : "none" }}
    >
      <path d={strokePath(points, size)} fill={color} opacity={opacity} />
    </svg>
  );
}
