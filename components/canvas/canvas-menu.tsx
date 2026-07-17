"use client";

import { useEffect, useRef, useState } from "react";
import { Grid3x3, Download } from "lucide-react";
import { useWorkspaceStore, type BgVariant } from "@/core/state/workspace-store";
import { exportBoard } from "./export-canvas";
import { useFloatingPanelRect } from "./use-floating-panel-rect";
import { cn } from "@/lib/utils";

const GRIDS: { value: BgVariant; label: string }[] = [
  { value: "dots", label: "Dots" },
  { value: "lines", label: "Lines" },
  { value: "cross", label: "Cross" },
  { value: "none", label: "None" },
];

const EXPORTS = ["png", "svg", "pdf"] as const;

export function CanvasMenu() {
  const bgVariant = useWorkspaceStore((s) => s.bgVariant);
  const setBgVariant = useWorkspaceStore((s) => s.setBgVariant);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const ref = useRef<HTMLDivElement>(null);
  const panelRef = useFloatingPanelRect("canvas-menu", open);

  useEffect(() => {
    if (!open) return;
    function onDown(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    window.addEventListener("mousedown", onDown);
    return () => window.removeEventListener("mousedown", onDown);
  }, [open]);

  async function doExport(type: (typeof EXPORTS)[number]) {
    setBusy(true);
    setMsg(null);
    try {
      await exportBoard(useWorkspaceStore.getState().nodes, type);
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "Export failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="inline-flex items-center gap-1.5 rounded-md border border-zinc-200 px-3 py-1.5 text-sm transition-all hover:bg-zinc-100 active:scale-95"
        aria-haspopup="menu"
        aria-expanded={open}
      >
        <Grid3x3 className="size-3.5" /> Canvas
      </button>
      {open && (
        <div
          ref={panelRef}
          role="menu"
          className="absolute right-0 top-full z-50 mt-1 w-56 rounded-xl border border-border bg-surface p-3 shadow-xl"
        >
          <p className="mb-1.5 text-xs font-semibold text-muted-foreground">Grid</p>
          <div className="grid grid-cols-4 gap-1">
            {GRIDS.map((g) => (
              <button
                key={g.value}
                type="button"
                onClick={() => setBgVariant(g.value)}
                className={cn(
                  "rounded-md border px-1 py-1.5 text-[11px] font-medium transition-colors active:scale-95",
                  bgVariant === g.value
                    ? "border-brand-accent bg-brand-accent/10 text-brand-accent"
                    : "border-border text-muted-foreground hover:bg-muted",
                )}
              >
                {g.label}
              </button>
            ))}
          </div>

          <div className="my-3 h-px bg-border" />

          <p className="mb-1.5 flex items-center gap-1 text-xs font-semibold text-muted-foreground">
            <Download className="size-3" /> Export board
          </p>
          <div className="grid grid-cols-3 gap-1.5">
            {EXPORTS.map((f) => (
              <button
                key={f}
                type="button"
                disabled={busy}
                onClick={() => doExport(f)}
                className="rounded-md border border-border py-1.5 text-xs font-medium uppercase text-foreground transition-colors hover:bg-muted active:scale-95 disabled:opacity-50"
              >
                {f}
              </button>
            ))}
          </div>
          {busy && <p className="mt-2 text-[11px] text-muted-foreground">Rendering…</p>}
          {msg && <p className="mt-2 text-[11px] text-destructive">{msg}</p>}
        </div>
      )}
    </div>
  );
}
