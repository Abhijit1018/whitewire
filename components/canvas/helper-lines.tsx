"use client";

import { useEffect, useRef } from "react";
import { useStore, type ReactFlowState } from "@xyflow/react";

const selectW = (s: ReactFlowState) => s.width;
const selectH = (s: ReactFlowState) => s.height;
const selectT = (s: ReactFlowState) => s.transform;

/**
 * Draws the active alignment guide lines (in flow coordinates) onto a canvas
 * overlay, converting to screen space via React Flow's viewport transform.
 * `horizontal`/`vertical` are flow-space y/x; undefined means no line.
 */
export function HelperLines({
  horizontal,
  vertical,
}: {
  horizontal?: number;
  vertical?: number;
}) {
  const width = useStore(selectW);
  const height = useStore(selectH);
  const [tx, ty, zoom] = useStore(selectT);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;

    const dpr = window.devicePixelRatio || 1;
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, width, height);
    ctx.strokeStyle = "#e8590c"; // brand terracotta
    ctx.lineWidth = 1;

    if (typeof vertical === "number") {
      const x = vertical * zoom + tx;
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, height);
      ctx.stroke();
    }
    if (typeof horizontal === "number") {
      const y = horizontal * zoom + ty;
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
      ctx.stroke();
    }
  }, [width, height, tx, ty, zoom, horizontal, vertical]);

  return (
    <canvas
      ref={canvasRef}
      className="pointer-events-none absolute left-0 top-0 z-10"
      style={{ width, height }}
    />
  );
}
