"use client";

import { useEffect } from "react";
import { useReactFlow, type Edge } from "@xyflow/react";
import {
  MousePointer2, Hand, Pencil, Square, Circle, Diamond, Type, StickyNote,
  Sparkles, ScanLine, ChevronDown, Shapes, type LucideIcon,
} from "lucide-react";
import { PHASE1_TOOLS, toolForShortcut, type CanvasTool } from "@/core/canvas/tools";
import { SHAPES, type ShapeId } from "@/core/canvas/shapes";
import { useWorkspaceStore, type AiNode } from "@/core/state/workspace-store";
import { drawNodesToPng } from "./strokes-to-image";
import { applyCleanup } from "./cleanup-adapter";
import { interpretSketchAction } from "@/app/p/[projectId]/sketch-actions";
import { useRef, useState, useTransition } from "react";
import { cn } from "@/lib/utils";
import { useCollisionDodge } from "./use-collision-dodge";

const ICONS: Record<CanvasTool, LucideIcon> = {
  select: MousePointer2, hand: Hand, pen: Pencil, rectangle: Square, ellipse: Circle,
  diamond: Diamond, text: Type, note: StickyNote, aiNode: Sparkles,
  // not shown in Phase 1 but typed for completeness:
  arrow: MousePointer2, line: MousePointer2, image: MousePointer2, code: MousePointer2,
  eraser: MousePointer2, frame: MousePointer2,
};

const INSERT_DEFAULTS: Partial<Record<CanvasTool, { type: string; data: Record<string, unknown>; style?: React.CSSProperties }>> = {
  text: { type: "textNode", data: {} },
  note: { type: "noteNode", data: {} },
  aiNode: { type: "aiNode", data: { text: "New idea", kind: "idea" } },
};

export function CanvasToolbar({ projectId }: { projectId: string }) {
  const { screenToFlowPosition } = useReactFlow();
  const activeTool = useWorkspaceStore((s) => s.activeTool);
  const setActiveTool = useWorkspaceStore((s) => s.setActiveTool);
  const addNode = useWorkspaceStore((s) => s.addNode);
  const addNodesEdges = useWorkspaceStore((s) => s.addNodesEdges);
  const toolDefaults = useWorkspaceStore((s) => s.toolDefaults);
  const [pending, startTransition] = useTransition();
  const [msg, setMsg] = useState<string | null>(null);
  const [shapeMenuOpen, setShapeMenuOpen] = useState(false);
  const shapeMenuRef = useRef<HTMLDivElement>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const { collapsed, openPanelKey } = useCollisionDodge(wrapperRef);
  const [userExpanded, setUserExpanded] = useState(false);
  // Reset the manual "keep tools open" override whenever the set of open
  // dropdowns changes (a new one opens, or the current one closes).
  useEffect(() => {
    setUserExpanded(false);
  }, [openPanelKey]);
  // Compact = a dropdown overlaps us AND the user hasn't forced tools back open.
  const compact = collapsed && !userExpanded;
  const activeMeta = PHASE1_TOOLS.find((t) => t.tool === activeTool) ?? PHASE1_TOOLS[0];
  const ActiveIcon = ICONS[activeMeta.tool];

  function insert(tool: CanvasTool) {
    const def = INSERT_DEFAULTS[tool];
    if (!def) return;
    const position = screenToFlowPosition({ x: window.innerWidth / 2, y: window.innerHeight / 2 });
    addNode({
      id: crypto.randomUUID(),
      type: def.type,
      position,
      style: def.style,
      data: { text: "", kind: "generic", purpose: "", model: "", ...def.data, style: { ...toolDefaults } },
    });
  }

  function insertShape(shapeId: ShapeId) {
    const isLine = shapeId === "line" || shapeId === "arrow";
    const position = screenToFlowPosition({ x: window.innerWidth / 2, y: window.innerHeight / 2 });
    addNode({
      id: crypto.randomUUID(),
      type: "shapeNode",
      position,
      style: isLine ? { width: 160, height: 60 } : { width: 140, height: 100 },
      data: { text: "", kind: "generic", purpose: "", model: "", shape: shapeId, style: { ...toolDefaults } },
    });
    setShapeMenuOpen(false);
  }

  function activate(tool: CanvasTool, behavior: "mode" | "insert") {
    if (behavior === "insert") insert(tool);
    else setActiveTool(tool);
  }

  // Keyboard shortcuts (ignored while typing in inputs).
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const el = e.target as HTMLElement;
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      if (el && (el.tagName === "INPUT" || el.tagName === "TEXTAREA" || el.isContentEditable)) return;
      const tool = toolForShortcut(e.key);
      if (!tool) return;
      const meta = PHASE1_TOOLS.find((t) => t.tool === tool);
      if (!meta) return;
      e.preventDefault();
      activate(tool, meta.behavior);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Close the shapes dropdown on outside click or Escape.
  useEffect(() => {
    if (!shapeMenuOpen) return;
    function onPointerDown(e: PointerEvent) {
      if (shapeMenuRef.current && !shapeMenuRef.current.contains(e.target as Node)) {
        setShapeMenuOpen(false);
      }
    }
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setShapeMenuOpen(false);
    }
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [shapeMenuOpen]);

  function readSketch() {
    startTransition(async () => {
      setMsg(null);
      const png = await drawNodesToPng(useWorkspaceStore.getState().nodes);
      if (!png) { setMsg("Draw with the Pen first."); return; }
      const res = await interpretSketchAction(projectId, png);
      if (res.error) { setMsg(res.error); return; }
      const bp = res.nodes ?? [];
      if (bp.length === 0) return;
      const ids = bp.map(() => crypto.randomUUID());
      const newNodes: AiNode[] = bp.map((n, i) => ({
        id: ids[i], type: "aiNode",
        position: { x: 120 + (i % 4) * 280, y: 100 + Math.floor(i / 4) * 180 },
        data: { text: n.title, kind: n.kind, purpose: n.note, model: "" },
      }));
      const newEdges: Edge[] = (res.edges ?? []).map(([a, b]) => ({
        id: crypto.randomUUID(), source: ids[a], target: ids[b],
      }));
      addNodesEdges(newNodes, newEdges);
      applyCleanup();
    });
  }

  return (
    <div ref={wrapperRef} className="absolute left-1/2 top-3 z-30 -translate-x-1/2">
      <div className="flex items-center rounded-2xl border border-border bg-card/95 p-1.5 shadow-sm backdrop-blur">
        {/* Full toolbar: collapses to zero width (grid 1fr→0fr) when a header
            dropdown overlaps us, so the dropdown gets its space back. */}
        <div
          className={cn(
            "grid transition-[grid-template-columns] duration-200 ease-out",
            compact ? "grid-cols-[0fr]" : "grid-cols-[1fr]",
          )}
          aria-hidden={compact}
        >
          {/* Clip only while shrinking; when expanded, stay visible so the
              Shapes flyout (which opens below the row) isn't cut off. */}
          <div className={compact ? "overflow-hidden" : "overflow-visible"}>
            <div
              className={cn(
                "flex items-center gap-1 transition-opacity duration-150",
                compact && "pointer-events-none opacity-0",
              )}
            >
              {PHASE1_TOOLS.map((t) => {
                const Icon = ICONS[t.tool];
                const active = t.behavior === "mode" && activeTool === t.tool;
                return (
                  <span key={t.tool} className="contents">
                    <button
                      type="button"
                      title={t.shortcut ? `${t.label} (${t.shortcut.toUpperCase()})` : t.label}
                      onClick={() => activate(t.tool, t.behavior)}
                      className={cn(
                        "flex size-9 items-center justify-center rounded-lg transition-colors active:scale-95",
                        active ? "bg-brand-accent/12 text-brand-accent" : "text-muted-foreground hover:bg-muted",
                      )}
                    >
                      <Icon className="size-4" />
                    </button>
                    {t.tool === "pen" && (
                      <div className="relative" ref={shapeMenuRef}>
                        <button
                          type="button"
                          title="Shapes"
                          onClick={() => setShapeMenuOpen((o) => !o)}
                          className="flex h-9 items-center gap-0.5 rounded-lg px-2 text-muted-foreground transition-colors hover:bg-muted"
                        >
                          <Shapes className="size-4" />
                          <ChevronDown className="size-3" />
                        </button>
                        {shapeMenuOpen && (
                          <div className="absolute left-0 top-11 z-40 w-56 rounded-xl border border-border bg-card p-2 shadow-lg">
                            {(["basic", "flowchart", "decorative"] as const).map((cat) => (
                              <div key={cat} className="mb-1.5 last:mb-0">
                                <p className="px-1.5 pb-1 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">{cat}</p>
                                <div className="grid grid-cols-2 gap-0.5">
                                  {SHAPES.filter((s) => s.category === cat).map((s) => (
                                    <button
                                      key={s.id}
                                      type="button"
                                      onClick={() => insertShape(s.id)}
                                      className="rounded-md px-2 py-1.5 text-left text-xs text-foreground transition-colors hover:bg-muted"
                                    >
                                      {s.label}
                                    </button>
                                  ))}
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </span>
                );
              })}
              <div className="mx-1 h-6 w-px bg-border" />
              <button
                type="button"
                title="Read sketch"
                onClick={readSketch}
                disabled={pending}
                className="flex size-9 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted disabled:opacity-50"
              >
                <ScanLine className="size-4" />
              </button>
            </div>
          </div>
        </div>
        {/* Compact stand-in: shows the active tool + a chevron to pop tools back
            out. Only present (and clickable) while shrunk. */}
        {compact && (
          <button
            type="button"
            title="Expand toolbar"
            onClick={() => setUserExpanded(true)}
            className="flex h-9 items-center gap-0.5 rounded-lg px-2 text-brand-accent transition-colors hover:bg-muted"
          >
            <ActiveIcon className="size-4" />
            <ChevronDown className="size-3 text-muted-foreground" />
          </button>
        )}
      </div>
      {msg && (
        <p className="mt-1 rounded-xl border border-border bg-card/90 px-2 py-1 text-center text-[11px] text-destructive shadow-sm">
          {msg}
        </p>
      )}
    </div>
  );
}
