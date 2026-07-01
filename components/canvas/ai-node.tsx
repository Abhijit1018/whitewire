"use client";

import { Handle, NodeResizer, Position, type NodeProps } from "@xyflow/react";
import { useWorkspaceStore, type AiNode as AiNodeType } from "@/core/state/workspace-store";

const KIND_STYLES: Record<string, string> = {
  idea: "bg-amber-100 text-amber-700",
  feature: "bg-blue-100 text-blue-700",
  component: "bg-violet-100 text-violet-700",
  generic: "bg-zinc-100 text-zinc-600",
};

const handleClass = "!h-2.5 !w-2.5 !border-2 !border-white !bg-indigo-400";

export function AiNode({ data, selected }: NodeProps<AiNodeType>) {
  const kind = data.kind || "generic";
  return (
    <div
      className={`w-60 overflow-hidden rounded-xl border bg-white shadow-sm transition-all duration-150 hover:-translate-y-0.5 hover:shadow-md ${
        selected ? "border-indigo-500 ring-2 ring-indigo-200" : "border-zinc-200"
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
      <div className="line-clamp-4 px-3 py-2 text-[13px] leading-snug text-zinc-800">
        {data.text || "Untitled"}
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
        selected ? "border-indigo-500 ring-2 ring-indigo-200" : "border-zinc-200"
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
  const shape = data.shape ?? "rectangle";
  const radius = shape === "ellipse" ? "9999px" : "10px";
  const rotate = shape === "diamond";
  return (
    <div className="relative h-full w-full">
      <NodeResizer
        minWidth={90}
        minHeight={60}
        isVisible={!!selected}
        lineClassName="!border-indigo-400"
        handleClassName="!h-2 !w-2 !rounded-sm !border-white !bg-indigo-500"
      />
      <Handle type="target" position={Position.Top} className={handleClass} />
      <div
        className={`flex h-full w-full items-center justify-center border-2 bg-white transition-colors ${
          selected ? "border-indigo-500" : "border-zinc-400"
        }`}
        style={{ borderRadius: radius, transform: rotate ? "rotate(45deg)" : undefined }}
      >
        <input
          className="nodrag w-[78%] bg-transparent text-center text-sm text-zinc-800 outline-none"
          style={{ transform: rotate ? "rotate(-45deg)" : undefined }}
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
};
