"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useReactFlow } from "@xyflow/react";
import { useWorkspaceStore } from "@/core/state/workspace-store";
import { SHAPES } from "@/core/canvas/shapes";
import { fuzzyFilter } from "@/core/canvas/fuzzy";
import { exportBoard } from "./export-canvas";
import { applyCleanup } from "./cleanup-adapter";
import { cn } from "@/lib/utils";

type Command = { id: string; label: string; group: string; run: () => void };

export function CommandPalette() {
  const { screenToFlowPosition } = useReactFlow();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const setActiveTool = useWorkspaceStore((s) => s.setActiveTool);
  const addNode = useWorkspaceStore((s) => s.addNode);
  const setBgVariant = useWorkspaceStore((s) => s.setBgVariant);
  const snapToGrid = useWorkspaceStore((s) => s.snapToGrid);
  const setSnapToGrid = useWorkspaceStore((s) => s.setSnapToGrid);
  const alignNodes = useWorkspaceStore((s) => s.alignNodes);
  const distributeNodes = useWorkspaceStore((s) => s.distributeNodes);
  const duplicateNodes = useWorkspaceStore((s) => s.duplicateNodes);
  const deleteNodes = useWorkspaceStore((s) => s.deleteNodes);
  const toolDefaults = useWorkspaceStore((s) => s.toolDefaults);
  const nodes = useWorkspaceStore((s) => s.nodes);

  // Global toggle.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && (e.key === "k" || e.key === "K")) {
        e.preventDefault();
        setOpen((o) => !o);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    if (open) {
      setQuery("");
      setActive(0);
      // focus after the panel mounts
      requestAnimationFrame(() => inputRef.current?.focus());
    }
  }, [open]);

  const selectedIds = useMemo(() => nodes.filter((n) => n.selected).map((n) => n.id), [nodes]);

  const commands = useMemo<Command[]>(() => {
    const close = () => setOpen(false);
    const insertCenter = (type: string, data: Record<string, unknown>) => {
      const position = screenToFlowPosition({ x: window.innerWidth / 2, y: window.innerHeight / 2 });
      addNode({
        id: crypto.randomUUID(),
        type,
        position,
        data: { text: "", kind: "generic", purpose: "", model: "", ...data, style: { ...toolDefaults } },
      });
    };
    const wrap = (fn: () => void) => () => { fn(); close(); };

    const list: Command[] = [
      { id: "tool-select", label: "Select tool", group: "Tools", run: wrap(() => setActiveTool("select")) },
      { id: "tool-hand", label: "Hand / pan tool", group: "Tools", run: wrap(() => setActiveTool("hand")) },
      { id: "tool-pen", label: "Pen tool", group: "Tools", run: wrap(() => setActiveTool("pen")) },
      { id: "add-text", label: "Add text", group: "Insert", run: wrap(() => insertCenter("textNode", {})) },
      { id: "add-note", label: "Add sticky note", group: "Insert", run: wrap(() => insertCenter("noteNode", {})) },
      { id: "add-ai", label: "Add AI node", group: "Insert", run: wrap(() => insertCenter("aiNode", { text: "New idea", kind: "idea" })) },
      ...SHAPES.map((s) => ({
        id: `shape-${s.id}`,
        label: `Insert ${s.label}`,
        group: "Shapes",
        run: wrap(() => insertCenter("shapeNode", { shape: s.id })),
      })),
      { id: "grid-dots", label: "Grid: dots", group: "Canvas", run: wrap(() => setBgVariant("dots")) },
      { id: "grid-lines", label: "Grid: lines", group: "Canvas", run: wrap(() => setBgVariant("lines")) },
      { id: "grid-cross", label: "Grid: cross", group: "Canvas", run: wrap(() => setBgVariant("cross")) },
      { id: "grid-none", label: "Grid: none", group: "Canvas", run: wrap(() => setBgVariant("none")) },
      { id: "snap", label: `${snapToGrid ? "Disable" : "Enable"} snap to grid`, group: "Canvas", run: wrap(() => setSnapToGrid(!snapToGrid)) },
      { id: "tidy", label: "Tidy up (auto-layout)", group: "Canvas", run: wrap(() => applyCleanup()) },
      { id: "export-png", label: "Export board as PNG", group: "Canvas", run: wrap(() => void exportBoard(useWorkspaceStore.getState().nodes, "png")) },
      { id: "export-svg", label: "Export board as SVG", group: "Canvas", run: wrap(() => void exportBoard(useWorkspaceStore.getState().nodes, "svg")) },
      { id: "export-pdf", label: "Export board as PDF", group: "Canvas", run: wrap(() => void exportBoard(useWorkspaceStore.getState().nodes, "pdf")) },
    ];

    if (selectedIds.length >= 1) {
      list.push(
        { id: "dup-sel", label: "Duplicate selection", group: "Selection", run: wrap(() => duplicateNodes(selectedIds)) },
        { id: "del-sel", label: "Delete selection", group: "Selection", run: wrap(() => deleteNodes(selectedIds)) },
      );
    }
    if (selectedIds.length >= 2) {
      const aligns = [
        ["left", "Align left"], ["center-h", "Align center"], ["right", "Align right"],
        ["top", "Align top"], ["middle", "Align middle"], ["bottom", "Align bottom"],
      ] as const;
      for (const [edge, label] of aligns) {
        list.push({ id: `align-${edge}`, label, group: "Selection", run: wrap(() => alignNodes(selectedIds, edge)) });
      }
    }
    if (selectedIds.length >= 3) {
      list.push(
        { id: "dist-h", label: "Distribute horizontally", group: "Selection", run: wrap(() => distributeNodes(selectedIds, "h")) },
        { id: "dist-v", label: "Distribute vertically", group: "Selection", run: wrap(() => distributeNodes(selectedIds, "v")) },
      );
    }
    return list;
  }, [screenToFlowPosition, addNode, setActiveTool, setBgVariant, snapToGrid, setSnapToGrid,
      alignNodes, distributeNodes, duplicateNodes, deleteNodes, toolDefaults, selectedIds]);

  const results = useMemo(
    () => fuzzyFilter(commands, query, (c) => `${c.label} ${c.group}`),
    [commands, query],
  );

  useEffect(() => { setActive(0); }, [query]);

  if (!open) return null;

  function onInputKey(e: React.KeyboardEvent) {
    if (e.key === "ArrowDown") { e.preventDefault(); setActive((i) => Math.min(i + 1, results.length - 1)); }
    else if (e.key === "ArrowUp") { e.preventDefault(); setActive((i) => Math.max(i - 1, 0)); }
    else if (e.key === "Enter") { e.preventDefault(); results[active]?.run(); }
    else if (e.key === "Escape") { e.preventDefault(); setOpen(false); }
  }

  return (
    <div
      className="fixed inset-0 z-[70] flex items-start justify-center bg-black/20 p-4 pt-[15vh]"
      onMouseDown={() => setOpen(false)}
    >
      <div
        className="w-full max-w-lg overflow-hidden rounded-2xl border border-border bg-surface shadow-2xl"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <input
          ref={inputRef}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={onInputKey}
          placeholder="Search actions…  (↑↓ to move, ↵ to run, Esc to close)"
          className="w-full border-b border-border bg-transparent px-4 py-3 text-sm outline-none placeholder:text-muted-foreground"
        />
        <div className="max-h-80 overflow-y-auto p-1">
          {results.length === 0 ? (
            <p className="px-3 py-6 text-center text-sm text-muted-foreground">No matching actions.</p>
          ) : (
            results.map((c, i) => (
              <button
                key={c.id}
                type="button"
                onMouseEnter={() => setActive(i)}
                onClick={() => c.run()}
                className={cn(
                  "flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-sm transition-colors",
                  i === active ? "bg-brand-accent/12 text-foreground" : "text-foreground hover:bg-muted",
                )}
              >
                <span>{c.label}</span>
                <span className="text-[11px] text-muted-foreground">{c.group}</span>
              </button>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
