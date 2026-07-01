"use client";

import { Handle, NodeResizer, Position, type NodeProps } from "@xyflow/react";
import type { AiNode as AiNodeType } from "@/core/state/workspace-store";
import type { WireframeElement } from "@/core/ai/wireframe";

const handleClass = "!h-2.5 !w-2.5 !border-2 !border-white !bg-indigo-400";

function elementStyle(type: string): string {
  switch (type) {
    case "nav":
      return "bg-zinc-800 text-white text-[9px] flex items-center px-1";
    case "header":
      return "font-semibold text-zinc-800 text-[11px] flex items-center";
    case "button":
      return "bg-indigo-600 text-white rounded text-[9px] flex items-center justify-center";
    case "input":
      return "border border-zinc-300 rounded bg-white text-[9px] text-zinc-400 flex items-center px-1";
    case "image":
      return "bg-zinc-200 text-zinc-400 text-[9px] flex items-center justify-center";
    case "card":
      return "border border-zinc-300 rounded bg-white text-[9px] text-zinc-500 flex items-center justify-center";
    case "list":
      return "border border-zinc-300 rounded bg-white text-[9px] text-zinc-500 flex flex-col divide-y";
    default:
      return "text-zinc-600 text-[10px] flex items-center";
  }
}

export function WireframeNode({ data, selected }: NodeProps<AiNodeType>) {
  const wf = data.wireframe;
  const elements: WireframeElement[] = wf?.elements ?? [];
  return (
    <div
      className={`flex h-full w-full flex-col overflow-hidden rounded-lg border bg-white shadow-sm ${
        selected ? "border-indigo-500 ring-2 ring-indigo-200" : "border-zinc-300"
      }`}
    >
      <NodeResizer
        minWidth={220}
        minHeight={160}
        isVisible={!!selected}
        lineClassName="!border-indigo-400"
        handleClassName="!h-2 !w-2 !rounded-sm !border-white !bg-indigo-500"
      />
      <Handle type="target" position={Position.Top} className={handleClass} />
      <div className="flex items-center gap-2 border-b border-zinc-100 bg-zinc-50 px-2 py-1">
        <span className="text-[10px] font-medium uppercase tracking-wide text-zinc-500">
          wireframe
        </span>
        <span className="truncate text-[11px] text-zinc-700">{wf?.title || data.text}</span>
      </div>
      <div className="relative flex-1 bg-white">
        {elements.map((el, i) => (
          <div
            key={i}
            className={`absolute overflow-hidden ${elementStyle(el.type)}`}
            style={{
              left: `${el.x}%`,
              top: `${el.y}%`,
              width: `${el.w}%`,
              height: `${el.h}%`,
            }}
            title={`${el.type}: ${el.label}`}
          >
            <span className="truncate px-0.5">{el.label}</span>
          </div>
        ))}
      </div>
      <Handle type="source" position={Position.Bottom} className={handleClass} />
    </div>
  );
}
