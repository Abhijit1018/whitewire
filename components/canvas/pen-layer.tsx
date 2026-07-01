"use client";

import { useRef, useState } from "react";
import { useReactFlow } from "@xyflow/react";
import { useWorkspaceStore } from "@/core/state/workspace-store";
import { strokePath } from "./freehand";

const PEN_COLOR = "#3f3f46";
const PEN_SIZE = 6;

export function PenLayer() {
  const { screenToFlowPosition } = useReactFlow();
  const addNode = useWorkspaceStore((s) => s.addNode);
  const ref = useRef<HTMLDivElement>(null);
  const drawing = useRef(false);
  const flowPts = useRef<number[][]>([]);
  const [screenPts, setScreenPts] = useState<number[][]>([]);

  function localPoint(e: React.PointerEvent) {
    const rect = ref.current!.getBoundingClientRect();
    return [e.clientX - rect.left, e.clientY - rect.top];
  }

  function down(e: React.PointerEvent) {
    drawing.current = true;
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    setScreenPts([localPoint(e)]);
    const fp = screenToFlowPosition({ x: e.clientX, y: e.clientY });
    flowPts.current = [[fp.x, fp.y]];
  }

  function move(e: React.PointerEvent) {
    if (!drawing.current) return;
    setScreenPts((p) => [...p, localPoint(e)]);
    const fp = screenToFlowPosition({ x: e.clientX, y: e.clientY });
    flowPts.current.push([fp.x, fp.y]);
  }

  function up() {
    if (!drawing.current) return;
    drawing.current = false;
    const pts = flowPts.current;
    if (pts.length > 1) {
      const xs = pts.map((p) => p[0]);
      const ys = pts.map((p) => p[1]);
      const minX = Math.min(...xs);
      const minY = Math.min(...ys);
      addNode({
        id: crypto.randomUUID(),
        type: "drawNode",
        position: { x: minX, y: minY },
        data: {
          text: "",
          kind: "generic",
          purpose: "",
          model: "",
          points: pts.map(([x, y]) => [x - minX, y - minY]),
          color: PEN_COLOR,
          size: PEN_SIZE,
        },
      });
    }
    setScreenPts([]);
    flowPts.current = [];
  }

  return (
    <div
      ref={ref}
      className="absolute inset-0 z-10 cursor-crosshair"
      style={{ touchAction: "none" }}
      onPointerDown={down}
      onPointerMove={move}
      onPointerUp={up}
      onPointerLeave={up}
    >
      {screenPts.length > 0 && (
        <svg className="pointer-events-none absolute inset-0 h-full w-full">
          <path d={strokePath(screenPts, PEN_SIZE)} fill={PEN_COLOR} />
        </svg>
      )}
    </div>
  );
}
