"use client";

import { Handle, Position, type NodeProps } from "@xyflow/react";
import type { AiNode as AiNodeType } from "@/core/state/workspace-store";

export function AiNode({ data, selected }: NodeProps<AiNodeType>) {
  return (
    <div
      className={`rounded-lg border bg-white px-3 py-2 shadow-sm ${
        selected ? "border-indigo-500 ring-2 ring-indigo-200" : "border-zinc-300"
      }`}
      style={{ width: 220 }}
    >
      <Handle type="target" position={Position.Top} className="!bg-zinc-400" />
      <div className="text-[10px] uppercase tracking-wide text-zinc-500">
        {data.kind || "node"}
      </div>
      <div className="text-sm text-zinc-900">{data.text || "(empty)"}</div>
      <Handle type="source" position={Position.Bottom} className="!bg-zinc-400" />
    </div>
  );
}

export const nodeTypes = { aiNode: AiNode };
