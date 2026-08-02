"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { buildMemoryGraph } from "@/core/memory/links";
import { layoutForce, boundsOf, type ForceNode } from "@/core/memory/force-layout";
import type { Note } from "./memory-workbench";

type View = { x: number; y: number; scale: number };

/** Circle radius grows with how connected a node is, as in a vault graph. */
function radiusFor(degree: number): number {
  return 4 + Math.min(Math.sqrt(degree) * 2.6, 11);
}

export function MemoryGraph({
  notes,
  activeId,
  onPick,
}: {
  notes: Note[];
  activeId: string | null;
  onPick: (title: string) => void;
}) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const [view, setView] = useState<View>({ x: 0, y: 0, scale: 1 });
  const [hovered, setHovered] = useState<string | null>(null);
  const drag = useRef<{ x: number; y: number; vx: number; vy: number } | null>(null);
  const [fitted, setFitted] = useState(false);

  const graph = useMemo(() => buildMemoryGraph(notes), [notes]);

  // The simulation is the expensive part, so it runs only when the graph
  // actually changes — never on pan, zoom or hover.
  const positioned = useMemo(() => {
    const nodes = layoutForce(
      graph.nodes.map((n) => n.id),
      graph.links.map((l) => ({ from: l.from, to: l.to })),
    );
    return new Map(nodes.map((n) => [n.id, n]));
  }, [graph]);

  // Frame the whole graph once, then leave the viewport under the user's control.
  useEffect(() => {
    const el = wrapRef.current;
    if (!el || fitted || positioned.size === 0) return;
    const b = boundsOf([...positioned.values()] as ForceNode[]);
    const pad = 60;
    const scale = Math.min(
      el.clientWidth / Math.max(b.w + pad * 2, 1),
      el.clientHeight / Math.max(b.h + pad * 2, 1),
      1.6,
    );
    setView({
      x: el.clientWidth / 2 - (b.x + b.w / 2) * scale,
      y: el.clientHeight / 2 - (b.y + b.h / 2) * scale,
      scale,
    });
    setFitted(true);
  }, [positioned, fitted]);

  function onWheel(e: React.WheelEvent) {
    e.preventDefault();
    const el = wrapRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const px = e.clientX - rect.left;
    const py = e.clientY - rect.top;
    const factor = e.deltaY < 0 ? 1.12 : 1 / 1.12;
    setView((v) => {
      const scale = Math.min(Math.max(v.scale * factor, 0.15), 4);
      const k = scale / v.scale;
      // Keep the point under the cursor fixed while zooming.
      return { scale, x: px - (px - v.x) * k, y: py - (py - v.y) * k };
    });
  }

  function onPointerDown(e: React.PointerEvent) {
    (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
    drag.current = { x: e.clientX, y: e.clientY, vx: view.x, vy: view.y };
  }

  function onPointerMove(e: React.PointerEvent) {
    if (!drag.current) return;
    setView((v) => ({
      ...v,
      x: drag.current!.vx + (e.clientX - drag.current!.x),
      y: drag.current!.vy + (e.clientY - drag.current!.y),
    }));
  }

  function endDrag() {
    drag.current = null;
  }

  const neighbours = useMemo(() => {
    if (!hovered) return new Set<string>();
    const set = new Set<string>([hovered]);
    for (const link of graph.links) {
      if (link.from === hovered) set.add(link.to);
      if (link.to === hovered) set.add(link.from);
    }
    return set;
  }, [hovered, graph.links]);

  if (graph.nodes.length === 0) {
    return (
      <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
        Nothing here yet — build a board and it appears.
      </div>
    );
  }

  // Labels only once there's room for them, or the map turns into a wall of text.
  const showLabels = view.scale > 0.55;

  return (
    <div
      ref={wrapRef}
      onWheel={onWheel}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={endDrag}
      onPointerLeave={endDrag}
      className="relative h-full w-full cursor-grab overflow-hidden active:cursor-grabbing"
      style={{ touchAction: "none" }}
    >
      <svg className="h-full w-full">
        <g transform={`translate(${view.x} ${view.y}) scale(${view.scale})`}>
          {graph.links.map((link, i) => {
            const a = positioned.get(link.from);
            const b = positioned.get(link.to);
            if (!a || !b) return null;
            const lit = hovered ? neighbours.has(link.from) && neighbours.has(link.to) : false;
            return (
              <line
                key={i}
                x1={a.x}
                y1={a.y}
                x2={b.x}
                y2={b.y}
                stroke="currentColor"
                className={lit ? "text-brand-accent" : "text-border"}
                strokeWidth={lit ? 1.5 : 0.7}
                opacity={hovered && !lit ? 0.25 : 1}
              />
            );
          })}

          {graph.nodes.map((node) => {
            const p = positioned.get(node.id);
            if (!p) return null;
            const isActive = node.id === activeId;
            const dimmed = hovered ? !neighbours.has(node.id) : false;
            return (
              <g
                key={node.id}
                transform={`translate(${p.x} ${p.y})`}
                opacity={dimmed ? 0.25 : 1}
                onMouseEnter={() => setHovered(node.id)}
                onMouseLeave={() => setHovered(null)}
                onClick={() => onPick(node.title)}
                className="cursor-pointer"
              >
                <circle
                  r={radiusFor(p.degree) + (isActive ? 3 : 0)}
                  className={
                    !node.exists
                      ? "fill-transparent stroke-muted-foreground"
                      : isActive
                        ? "fill-brand-accent"
                        : "fill-muted-foreground"
                  }
                  strokeDasharray={node.exists ? undefined : "2 2"}
                  strokeWidth={1}
                />
                {(showLabels || isActive || hovered === node.id) && (
                  <text
                    y={-radiusFor(p.degree) - 5}
                    textAnchor="middle"
                    className="pointer-events-none fill-foreground"
                    style={{ fontSize: `${Math.min(11 / view.scale, 14)}px` }}
                  >
                    {node.title.length > 24 ? `${node.title.slice(0, 24)}…` : node.title}
                  </text>
                )}
              </g>
            );
          })}
        </g>
      </svg>

      <div className="pointer-events-none absolute bottom-2 left-3 text-[11px] text-muted-foreground">
        {graph.nodes.length} nodes · {graph.links.length} links · drag to pan, scroll to zoom
      </div>
    </div>
  );
}
