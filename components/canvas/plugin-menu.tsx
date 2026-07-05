"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useWorkspaceStore } from "@/core/state/workspace-store";
import { PLUGINS } from "@/core/plugins/registry";
import { useInstalledPlugins } from "@/components/marketplace/use-installed-plugins";

/** Where to drop a plugin's nodes: below existing content, or a sensible default. */
function dropCenter() {
  const nodes = useWorkspaceStore.getState().nodes;
  if (nodes.length === 0) return { x: 400, y: 300 };
  const xs = nodes.map((n) => n.position.x);
  const ys = nodes.map((n) => n.position.y);
  const avgX = xs.reduce((a, b) => a + b, 0) / xs.length;
  return { x: avgX, y: Math.max(...ys) + 260 };
}

export function PluginMenu() {
  const { ids } = useInstalledPlugins();
  const addNodesEdges = useWorkspaceStore((s) => s.addNodesEdges);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onDown(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    window.addEventListener("mousedown", onDown);
    return () => window.removeEventListener("mousedown", onDown);
  }, [open]);

  const installed = PLUGINS.filter((p) => ids.includes(p.id));

  function run(id: string) {
    const plugin = PLUGINS.find((p) => p.id === id);
    if (!plugin) return;
    const { nodes, edges } = plugin.run({ center: dropCenter() });
    addNodesEdges(nodes, edges);
    setOpen(false);
  }

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="rounded-md border border-zinc-200 px-3 py-1.5 text-sm transition-all hover:bg-zinc-100 active:scale-95"
        aria-haspopup="menu"
        aria-expanded={open}
      >
        Plugins{installed.length > 0 ? ` (${installed.length})` : ""}
      </button>
      {open && (
        <div
          role="menu"
          className="absolute left-0 top-full z-30 mt-1 w-64 rounded-xl border border-border bg-surface p-1 shadow-lg"
        >
          {installed.length === 0 ? (
            <div className="px-3 py-3 text-sm text-muted-foreground">
              No plugins installed.{" "}
              <Link href="/marketplace" className="text-primary underline">
                Browse the marketplace
              </Link>
            </div>
          ) : (
            <>
              {installed.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  role="menuitem"
                  onClick={() => run(p.id)}
                  className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-sm transition-colors hover:bg-muted active:scale-[0.98]"
                >
                  <span aria-hidden>{p.icon}</span>
                  <span className="min-w-0">
                    <span className="block truncate font-medium text-foreground">{p.name}</span>
                    <span className="block truncate text-xs text-muted-foreground">{p.category}</span>
                  </span>
                </button>
              ))}
              <div className="my-1 h-px bg-border" />
              <Link
                href="/marketplace"
                className="block rounded-lg px-2.5 py-2 text-sm text-muted-foreground transition-colors hover:bg-muted"
              >
                Manage plugins →
              </Link>
            </>
          )}
        </div>
      )}
    </div>
  );
}
