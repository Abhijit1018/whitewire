"use client";

import { Panel, useReactFlow } from "@xyflow/react";
import { useWorkspaceStore, type AiNodeData } from "@/core/state/workspace-store";

const TOOLS: { type: string; label: string; hint: string; data: Partial<AiNodeData> }[] = [
  { type: "aiNode", label: "AI", hint: "AI node", data: { text: "New idea", kind: "idea" } },
  { type: "textNode", label: "Text", hint: "Text", data: {} },
  { type: "noteNode", label: "Note", hint: "Sticky note", data: {} },
];

export function CanvasToolbar() {
  const { screenToFlowPosition } = useReactFlow();
  const addNode = useWorkspaceStore((s) => s.addNode);

  function add(type: string, data: Partial<AiNodeData>) {
    const position = screenToFlowPosition({
      x: window.innerWidth / 2,
      y: window.innerHeight / 2,
    });
    addNode({
      id: crypto.randomUUID(),
      type,
      position,
      data: { text: "", kind: "generic", purpose: "", model: "", ...data },
    });
  }

  return (
    <Panel position="top-left" className="!m-3">
      <div className="flex flex-col gap-1 rounded-xl border border-zinc-200 bg-white p-1 shadow-sm">
        {TOOLS.map((t) => (
          <button
            key={t.type}
            type="button"
            title={t.hint}
            onClick={() => add(t.type, t.data)}
            className="rounded-lg px-2.5 py-2 text-xs font-medium text-zinc-600 transition-colors hover:bg-zinc-100 active:scale-95"
          >
            {t.label}
          </button>
        ))}
      </div>
    </Panel>
  );
}
