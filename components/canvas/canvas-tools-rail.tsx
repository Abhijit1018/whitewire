"use client";

import { useState, useTransition } from "react";
import type { Edge } from "@xyflow/react";
import { useReactFlow } from "@xyflow/react";
import {
  MousePointer2,
  Sparkles,
  Type,
  StickyNote,
  Square,
  Circle,
  Diamond,
  Pencil,
  ScanLine,
  type LucideIcon,
} from "lucide-react";
import { useWorkspaceStore, type AiNode, type AiNodeData } from "@/core/state/workspace-store";
import { drawNodesToPng } from "./strokes-to-image";
import { applyCleanup } from "./cleanup-adapter";
import { interpretSketchAction } from "@/app/p/[projectId]/sketch-actions";
import { cn } from "@/lib/utils";

type Tool = {
  type: string;
  label: string;
  icon: LucideIcon;
  data: Partial<AiNodeData>;
  style?: React.CSSProperties;
};

const TOOLS: Tool[] = [
  { type: "aiNode", label: "AI node", icon: Sparkles, data: { text: "New idea", kind: "idea" } },
  { type: "textNode", label: "Text", icon: Type, data: {} },
  { type: "noteNode", label: "Note", icon: StickyNote, data: {} },
  { type: "shapeNode", label: "Rectangle", icon: Square, data: { shape: "rectangle" }, style: { width: 150, height: 90 } },
  { type: "shapeNode", label: "Ellipse", icon: Circle, data: { shape: "ellipse" }, style: { width: 120, height: 120 } },
  { type: "shapeNode", label: "Diamond", icon: Diamond, data: { shape: "diamond" }, style: { width: 120, height: 120 } },
];

function RailButton({
  icon: Icon,
  label,
  active,
  onClick,
  disabled,
}: {
  icon: LucideIcon;
  label: string;
  active?: boolean;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "group/rail flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-sm transition-colors active:scale-[0.98] disabled:opacity-50",
        active ? "bg-brand-accent/12 text-brand-accent" : "text-muted-foreground hover:bg-muted",
      )}
    >
      <Icon className="size-4 shrink-0" />
      <span className="font-medium">{label}</span>
    </button>
  );
}

/**
 * Labeled left tool rail for the canvas (matches the product design). Keeps all
 * existing behaviors — insert nodes/shapes, select vs. pen, read sketch.
 */
export function CanvasToolsRail({ projectId }: { projectId: string }) {
  const { screenToFlowPosition } = useReactFlow();
  const addNode = useWorkspaceStore((s) => s.addNode);
  const addNodesEdges = useWorkspaceStore((s) => s.addNodesEdges);
  const penMode = useWorkspaceStore((s) => s.penMode);
  const setPenMode = useWorkspaceStore((s) => s.setPenMode);
  const [pending, startTransition] = useTransition();
  const [msg, setMsg] = useState<string | null>(null);

  function add(tool: Tool) {
    const position = screenToFlowPosition({ x: window.innerWidth / 2, y: window.innerHeight / 2 });
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
    <div className="absolute left-3 top-3 z-20 w-40">
      <div className="flex flex-col gap-0.5 rounded-2xl border border-border bg-card/95 p-1.5 shadow-sm backdrop-blur">
        <RailButton
          icon={MousePointer2}
          label="Select"
          active={!penMode}
          onClick={() => setPenMode(false)}
        />
        <RailButton icon={Pencil} label="Draw" active={penMode} onClick={() => setPenMode(true)} />
        <div className="my-1 h-px bg-border" />
        {TOOLS.map((t) => (
          <RailButton key={t.label} icon={t.icon} label={t.label} onClick={() => add(t)} />
        ))}
        <div className="my-1 h-px bg-border" />
        <RailButton icon={ScanLine} label={pending ? "Reading…" : "Read sketch"} onClick={readSketch} disabled={pending} />
      </div>
      {msg && (
        <p className="mt-1 max-w-[200px] rounded-xl border border-border bg-card/90 px-2 py-1 text-[11px] text-destructive shadow-sm">
          {msg}
        </p>
      )}
    </div>
  );
}
