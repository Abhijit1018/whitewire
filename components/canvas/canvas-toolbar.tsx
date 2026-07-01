"use client";

import { useState, useTransition } from "react";
import type { Edge } from "@xyflow/react";
import { useReactFlow } from "@xyflow/react";
import { useWorkspaceStore, type AiNode, type AiNodeData } from "@/core/state/workspace-store";
import { drawNodesToPng } from "./strokes-to-image";
import { applyCleanup } from "./cleanup-adapter";
import { interpretSketchAction } from "@/app/p/[projectId]/sketch-actions";

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

export function CanvasToolbar({ projectId }: { projectId: string }) {
  const { screenToFlowPosition } = useReactFlow();
  const addNode = useWorkspaceStore((s) => s.addNode);
  const addNodesEdges = useWorkspaceStore((s) => s.addNodesEdges);
  const penMode = useWorkspaceStore((s) => s.penMode);
  const setPenMode = useWorkspaceStore((s) => s.setPenMode);
  const [pending, startTransition] = useTransition();
  const [msg, setMsg] = useState<string | null>(null);

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

  function readSketch() {
    startTransition(async () => {
      setMsg(null);
      const png = await drawNodesToPng(useWorkspaceStore.getState().nodes);
      if (!png) {
        setMsg("Draw with the Pen first.");
        return;
      }
      const res = await interpretSketchAction(projectId, png);
      if (res.error) {
        setMsg(res.error);
        return;
      }
      const bp = res.nodes ?? [];
      if (bp.length === 0) return;
      const ids = bp.map(() => crypto.randomUUID());
      const newNodes: AiNode[] = bp.map((n, i) => ({
        id: ids[i],
        type: "aiNode",
        position: { x: 120 + (i % 4) * 280, y: 100 + Math.floor(i / 4) * 180 },
        data: { text: n.title, kind: n.kind, purpose: n.note, model: "" },
      }));
      const newEdges: Edge[] = (res.edges ?? []).map(([a, b]) => ({
        id: crypto.randomUUID(),
        source: ids[a],
        target: ids[b],
      }));
      addNodesEdges(newNodes, newEdges);
      applyCleanup();
    });
  }

  return (
    <div className="absolute left-3 top-3 z-20">
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
        <div className="my-0.5 h-px bg-zinc-200" />
        <button
          type="button"
          title="Select / move (hand)"
          onClick={() => setPenMode(false)}
          className={`rounded-lg px-2.5 py-2 text-xs font-medium transition-colors active:scale-95 ${
            !penMode ? "bg-zinc-900 text-white" : "text-zinc-600 hover:bg-zinc-100"
          }`}
        >
          Select
        </button>
        <button
          type="button"
          title="Pen — draw freehand"
          onClick={() => setPenMode(true)}
          className={`rounded-lg px-2.5 py-2 text-xs font-medium transition-colors active:scale-95 ${
            penMode ? "bg-indigo-600 text-white" : "text-zinc-600 hover:bg-zinc-100"
          }`}
        >
          Pen
        </button>
        <button
          type="button"
          title="Read sketch with AI (needs a vision model)"
          onClick={readSketch}
          disabled={pending}
          className="rounded-lg px-2.5 py-2 text-xs font-medium text-indigo-600 transition-colors hover:bg-indigo-50 active:scale-95 disabled:opacity-50"
        >
          {pending ? "…" : "Read"}
        </button>
      </div>
      {msg && (
        <p className="mt-1 max-w-[200px] rounded bg-white/90 px-2 py-1 text-[11px] text-red-600 shadow">
          {msg}
        </p>
      )}
    </div>
  );
}
