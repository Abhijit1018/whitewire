"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Handle, NodeResizer, Position, type NodeProps } from "@xyflow/react";
import { useWorkspaceStore, type AiNode as AiNodeType } from "@/core/state/workspace-store";
import { DrawNode } from "./draw-node";
import { WireframeNode } from "./wireframe-node";
import { RoughShape } from "./rough-shape";
import { type ShapeId } from "@/core/canvas/shapes";
import { DEFAULT_STYLE, type ShapeStyle } from "@/core/canvas/style";

function hashSeed(id: string): number {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) | 0;
  return Math.abs(h) || 1;
}

function RoughShapeFill({ id, shape, style, seed, selected }: { id: string; shape: ShapeId; style: ShapeStyle; seed: number; selected: boolean }) {
  const ref = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ w: 0, h: 0 });
  useEffect(() => {
    if (!ref.current) return;
    const ro = new ResizeObserver(([e]) => setSize({ w: e.contentRect.width, h: e.contentRect.height }));
    ro.observe(ref.current);
    return () => ro.disconnect();
  }, []);
  return (
    <div ref={ref} className={`h-full w-full ${selected ? "rounded outline outline-1 outline-brand-accent/40" : ""}`}>
      {size.w > 0 && <RoughShape shape={shape} width={size.w} height={size.h} style={style} seed={seed} />}
    </div>
  );
}

const KIND_STYLES: Record<string, string> = {
  idea: "bg-amber-100 text-amber-700",
  feature: "bg-blue-100 text-blue-700",
  component: "bg-rose-100 text-rose-700",
  generic: "bg-zinc-100 text-zinc-600",
};

const handleClass = "!h-2.5 !w-2.5 !border-2 !border-white !bg-brand-accent";

export function AiNode({ data, selected }: NodeProps<AiNodeType>) {
  const kind = data.kind || "generic";
  return (
    <div
      className={`w-60 overflow-hidden rounded-xl border bg-white shadow-sm transition-all duration-150 hover:-translate-y-0.5 hover:shadow-md ${
        selected ? "border-brand-accent ring-2 ring-brand-accent/30" : "border-zinc-200"
      }`}
    >
      <Handle type="target" position={Position.Top} className={handleClass} />
      <div className="flex items-center gap-2 border-b border-zinc-100 px-3 py-1.5">
        <span
          className={`rounded-full px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide ${
            KIND_STYLES[kind] ?? KIND_STYLES.generic
          }`}
        >
          {kind}
        </span>
      </div>
      <div className="px-3 py-2">
        <div className="line-clamp-3 text-[13px] font-medium leading-snug text-zinc-800">
          {data.text || "Untitled"}
        </div>
        {data.purpose ? (
          <div className="mt-1 line-clamp-2 text-[11px] leading-snug text-zinc-500">
            {data.purpose}
          </div>
        ) : null}
      </div>
      <Handle type="source" position={Position.Bottom} className={handleClass} />
    </div>
  );
}

export function TextNode({ id, data, selected }: NodeProps<AiNodeType>) {
  const updateNodeData = useWorkspaceStore((s) => s.updateNodeData);
  return (
    <div
      className={`w-56 rounded-lg border bg-white p-2 shadow-sm transition-shadow ${
        selected ? "border-brand-accent ring-2 ring-brand-accent/30" : "border-zinc-200"
      }`}
    >
      <Handle type="target" position={Position.Top} className={handleClass} />
      <textarea
        className="nodrag w-full resize-none bg-transparent text-sm text-zinc-800 outline-none"
        defaultValue={data.text}
        rows={2}
        placeholder="Type text…"
        onChange={(e) => updateNodeData(id, { text: e.target.value })}
      />
      <Handle type="source" position={Position.Bottom} className={handleClass} />
    </div>
  );
}

export function NoteNode({ id, data, selected }: NodeProps<AiNodeType>) {
  const updateNodeData = useWorkspaceStore((s) => s.updateNodeData);
  return (
    <div
      className={`w-52 rounded-md border p-2 shadow-sm transition-shadow ${
        selected ? "border-amber-400 ring-2 ring-amber-200" : "border-amber-200"
      }`}
      style={{ background: "#fef9c3" }}
    >
      <Handle type="target" position={Position.Top} className={handleClass} />
      <textarea
        className="nodrag w-full resize-none bg-transparent text-sm text-amber-900 outline-none placeholder:text-amber-500/60"
        defaultValue={data.text}
        rows={3}
        placeholder="Note…"
        onChange={(e) => updateNodeData(id, { text: e.target.value })}
      />
      <Handle type="source" position={Position.Bottom} className={handleClass} />
    </div>
  );
}

export function ShapeNode({ id, data, selected }: NodeProps<AiNodeType>) {
  const updateNodeData = useWorkspaceStore((s) => s.updateNodeData);
  const shape = (data.shape ?? "rectangle") as ShapeId;
  const style = data.style ?? DEFAULT_STYLE;
  const seed = useMemo(() => hashSeed(id), [id]);
  return (
    <div className="relative h-full w-full">
      <NodeResizer
        minWidth={40}
        minHeight={40}
        isVisible={!!selected}
        lineClassName="!border-brand-accent"
        handleClassName="!h-2 !w-2 !rounded-sm !border-white !bg-brand-accent"
      />
      <Handle type="target" position={Position.Top} className={handleClass} />
      <div className="relative h-full w-full">
        <div className="absolute inset-0">
          <RoughShapeFill id={id} shape={shape} style={style} seed={seed} selected={!!selected} />
        </div>
        <input
          className="nodrag absolute left-1/2 top-1/2 w-[78%] -translate-x-1/2 -translate-y-1/2 bg-transparent text-center text-sm text-zinc-800 outline-none"
          defaultValue={data.text}
          placeholder="Label"
          onChange={(e) => updateNodeData(id, { text: e.target.value })}
        />
      </div>
      <Handle type="source" position={Position.Bottom} className={handleClass} />
    </div>
  );
}

export const nodeTypes = {
  aiNode: AiNode,
  textNode: TextNode,
  noteNode: NoteNode,
  shapeNode: ShapeNode,
  drawNode: DrawNode,
  wireframeNode: WireframeNode,
};
