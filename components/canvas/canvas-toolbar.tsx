"use client";

import { Panel, useReactFlow } from "@xyflow/react";
import { useWorkspaceStore, type AiNodeData } from "@/core/state/workspace-store";

type Tool = {
  type: string;
  label: string;
  hint: string;
  data: Partial<AiNodeData>;
  style?: React.CSSProperties;
};

const TOOLS: Tool[] = [
  { type: "aiNode", label: "AI", hint: "AI node", data: { text: "New idea", kind: "idea" } },
  { type: "textNode", label: "Text", hint: "Text", data: {} },
  { type: "noteNode", label: "Note", hint: "Sticky note", data: {} },
  { type: "shapeNode", label: "▭", hint: "Rectangle", data: { shape: "rectangle" }, style: { width: 150, height: 90 } },
  { type: "shapeNode", label: "◯", hint: "Ellipse", data: { shape: "ellipse" }, style: { width: 120, height: 120 } },
  { type: "shapeNode", label: "◇", hint: "Diamond", data: { shape: "diamond" }, style: { width: 120, height: 120 } },
];

export function CanvasToolbar() {
  const { screenToFlowPosition } = useReactFlow();
  const addNode = useWorkspaceStore((s) => s.addNode);

  function add(tool: Tool) {
    const position = screenToFlowPosition({
      x: window.innerWidth / 2,
      y: window.innerHeight / 2,
    });
    addNode({
      id: crypto.randomUUID(),
      type: tool.type,
      position,
      style: tool.style,
      data: { text: "", kind: "generic", purpose: "", model: "", ...tool.data },
    });
  }

  return (
    <Panel position="top-left" className="!m-3">
      <div className="flex flex-col gap-1 rounded-xl border border-zinc-200 bg-white p-1 shadow-sm">
        {TOOLS.map((t) => (
          <button
            key={t.label}
            type="button"
            title={t.hint}
            onClick={() => add(t)}
            className="rounded-lg px-2.5 py-2 text-xs font-medium text-zinc-600 transition-colors hover:bg-zinc-100 active:scale-95"
          >
            {t.label}
          </button>
        ))}
      </div>
    </Panel>
  );
}
