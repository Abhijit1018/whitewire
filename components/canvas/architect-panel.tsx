"use client";

import { useState, useTransition } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useWorkspaceStore } from "@/core/state/workspace-store";
import { architectAction } from "@/app/p/[projectId]/architect-actions";
import type { ArchitectResult } from "@/core/ai/architect";

function summarizeBoard(): string {
  const { nodes, edges } = useWorkspaceStore.getState();
  const named = nodes.filter((n) => (n.data.text ?? "").trim().length > 0);
  const nameOf = (id: string) => nodes.find((n) => n.id === id)?.data.text ?? id;
  const nodeLines = named.map((n) => `- ${n.data.text} (${n.data.kind || n.type})`);
  const edgeLines = edges.map((e) => `- ${nameOf(e.source)} -> ${nameOf(e.target)}`);
  return [
    "Nodes:",
    ...(nodeLines.length ? nodeLines : ["(none)"]),
    "Connections:",
    ...(edgeLines.length ? edgeLines : ["(none)"]),
  ].join("\n");
}

function ListSection({ title, items }: { title: string; items: string[] }) {
  if (!items.length) return null;
  return (
    <section>
      <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-zinc-500">{title}</h4>
      <ul className="list-disc space-y-1 pl-5 text-zinc-700">
        {items.map((it, i) => (
          <li key={i}>{it}</li>
        ))}
      </ul>
    </section>
  );
}

export function ArchitectPanel({ projectId }: { projectId: string }) {
  const [open, setOpen] = useState(false);
  const [result, setResult] = useState<ArchitectResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const addNode = useWorkspaceStore((s) => s.addNode);

  function run() {
    const board = summarizeBoard();
    startTransition(async () => {
      setError(null);
      setResult(null);
      const res = await architectAction(projectId, board);
      if (res.error) setError(res.error);
      else setResult(res.result ?? null);
    });
  }

  function add(title: string, kind: string) {
    const count = useWorkspaceStore.getState().nodes.length;
    addNode({
      id: crypto.randomUUID(),
      type: "aiNode",
      position: { x: 160 + (count % 5) * 60, y: 130 + count * 30 },
      data: { text: title, kind, purpose: "", model: "" },
    });
  }

  const empty =
    result && result.missing.length + result.suggestions.length + result.improvements.length === 0;

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        setOpen(o);
        if (o) run();
      }}
    >
      <DialogTrigger className="rounded-md border border-brand-accent/30 bg-brand-accent/10 px-3 py-1.5 text-sm text-brand-accent transition-all hover:bg-brand-accent/15 active:scale-95">
        Architect
      </DialogTrigger>
      <DialogContent className="max-h-[80vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Architect Assist</DialogTitle>
        </DialogHeader>
        {pending && <p className="text-sm text-muted-foreground">Analyzing your board…</p>}
        {error && <p className="text-sm text-red-600">{error}</p>}
        {result && (
          <div className="space-y-5 text-sm">
            {result.suggestions.length > 0 && (
              <section>
                <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-zinc-500">
                  Suggested to add
                </h4>
                <ul className="space-y-1.5">
                  {result.suggestions.map((s, i) => (
                    <li
                      key={i}
                      className="flex items-center justify-between gap-2 rounded-md border border-zinc-200 px-2.5 py-1.5"
                    >
                      <span>
                        <span className="font-medium">{s.title}</span>{" "}
                        <span className="text-xs text-zinc-400">({s.kind})</span>
                      </span>
                      <button
                        type="button"
                        onClick={() => add(s.title, s.kind)}
                        className="rounded border border-brand-accent/30 px-2 py-0.5 text-xs text-brand-accent transition-colors hover:bg-brand-accent/10 active:scale-95"
                      >
                        + Add
                      </button>
                    </li>
                  ))}
                </ul>
              </section>
            )}
            <ListSection title="Missing" items={result.missing} />
            <ListSection title="Improvements" items={result.improvements} />
            {empty && (
              <p className="text-muted-foreground">
                No suggestions — add a few nodes first, then run Architect again.
              </p>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
