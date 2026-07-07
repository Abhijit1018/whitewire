"use client";

import { useMemo } from "react";
import { RoughGenerator } from "roughjs/bin/generator";
import { shapePrimitive, type ShapeId } from "@/core/canvas/shapes";
import { type ShapeStyle, dashArray } from "@/core/canvas/style";

const gen = new RoughGenerator();

export function RoughShape({
  shape, width, height, style, seed,
}: { shape: ShapeId; width: number; height: number; style: ShapeStyle; seed: number }) {
  const dashes = useMemo(() => dashArray(style.strokeStyle, style.strokeWidth), [style.strokeStyle, style.strokeWidth]);

  const paths = useMemo(() => {
    const w = Math.max(width, 8);
    const h = Math.max(height, 8);
    const prim = shapePrimitive(shape, w, h, style.edges);
    const hasFill = style.fill !== "transparent";
    const opts = {
      stroke: style.stroke,
      strokeWidth: style.strokeWidth,
      roughness: style.sloppiness,
      seed: seed || 1,
      fill: hasFill ? style.fill : undefined,
      fillStyle: "solid" as const,
    };
    let drawable;
    const p = 4;
    switch (prim.kind) {
      case "rect":
        drawable = prim.round
          ? gen.path(roundedRectPath(p, p, w - 2 * p, h - 2 * p, 12), opts)
          : gen.rectangle(p, p, w - 2 * p, h - 2 * p, opts);
        break;
      case "ellipse":
        drawable = gen.ellipse(w / 2, h / 2, w - 2 * p, h - 2 * p, opts);
        break;
      case "polygon":
        drawable = gen.polygon(prim.points, opts);
        break;
      case "path":
        drawable = gen.path(prim.d, opts);
        break;
      case "line": {
        const [[x1, y1], [x2, y2]] = prim.points;
        return [
          ...gen.toPaths(gen.line(x1, y1, x2, y2, opts)),
          ...(prim.arrow ? gen.toPaths(gen.linearPath(arrowHead(x1, y1, x2, y2), opts)) : []),
        ];
      }
    }
    return gen.toPaths(drawable);
  }, [shape, width, height, style, seed]);

  return (
    <svg width={Math.max(width, 8)} height={Math.max(height, 8)} style={{ overflow: "visible", opacity: style.opacity }}>
      {paths.map((pt, i) => (
        <path
          key={i}
          d={pt.d}
          stroke={pt.stroke}
          strokeWidth={pt.strokeWidth}
          fill={pt.fill ?? "none"}
          strokeDasharray={pt.stroke !== "none" && dashes.length ? dashes.join(" ") : undefined}
        />
      ))}
    </svg>
  );
}

function roundedRectPath(x: number, y: number, w: number, h: number, r: number): string {
  const rr = Math.min(r, w / 2, h / 2);
  return `M ${x + rr} ${y} L ${x + w - rr} ${y} Q ${x + w} ${y} ${x + w} ${y + rr} L ${x + w} ${y + h - rr} Q ${x + w} ${y + h} ${x + w - rr} ${y + h} L ${x + rr} ${y + h} Q ${x} ${y + h} ${x} ${y + h - rr} L ${x} ${y + rr} Q ${x} ${y} ${x + rr} ${y} Z`;
}

function arrowHead(x1: number, y1: number, x2: number, y2: number): [number, number][] {
  const a = Math.atan2(y2 - y1, x2 - x1);
  const len = 12;
  return [
    [x2 - len * Math.cos(a - Math.PI / 6), y2 - len * Math.sin(a - Math.PI / 6)],
    [x2, y2],
    [x2 - len * Math.cos(a + Math.PI / 6), y2 - len * Math.sin(a + Math.PI / 6)],
  ];
}
