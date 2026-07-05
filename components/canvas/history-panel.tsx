"use client";

import { useState, useTransition } from "react";
import type { Edge } from "@xyflow/react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useWorkspaceStore, type AiNode } from "@/core/state/workspace-store";
import {
  saveVersionAction,
  listVersionsAction,
  restoreVersionAction,
  listPromptsAction,
} from "@/app/p/[projectId]/version-actions";

type VersionMeta = { id: string; label: string; createdAt: string | Date };
type PromptEntry = { id: string; kind: string; prompt: string; createdAt: string | Date };

export function HistoryPanel({ projectId }: { projectId: string }) {
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<"versions" | "prompts">("versions");
  const [versions, setVersions] = useState<VersionMeta[]>([]);
  const [prompts, setPrompts] = useState<PromptEntry[]>([]);
  const [label, setLabel] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const setGraph = useWorkspaceStore((s) => s.setGraph);

  async function refresh() {
    const [v, p] = await Promise.all([listVersionsAction(projectId), listPromptsAction(projectId)]);
    setVersions(v as VersionMeta[]);
    setPrompts(p as PromptEntry[]);
  }

  function save() {
    const { nodes, edges } = useWorkspaceStore.getState();
    const snapshot = { nodes: nodes.map(({ selected, dragging, ...n }) => n), edges };
    startTransition(async () => {
      setMsg(null);
      const r = await saveVersionAction(projectId, snapshot, label);
      if (r.error) setMsg(r.error);
      else {
        setLabel("");
        await refresh();
      }
    });
  }

  function restore(id: string) {
    startTransition(async () => {
      setMsg(null);
      const r = await restoreVersionAction(id);
      if (r.error) {
        setMsg(r.error);
        return;
      }
      const snap = r.snapshot ?? {};
      setGraph((snap.nodes as AiNode[]) ?? [], (snap.edges as Edge[]) ?? []);
      setOpen(false);
    });
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        setOpen(o);
        if (o) refresh();
      }}
    >
      <DialogTrigger className="rounded-md border border-zinc-200 px-3 py-1.5 text-sm transition-all hover:bg-zinc-100 active:scale-95">
        History
      </DialogTrigger>
      <DialogContent className="max-h-[80vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>History</DialogTitle>
        </DialogHeader>
        <div className="flex gap-4 border-b pb-2 text-sm">
          <button
            className={tab === "versions" ? "font-semibold text-zinc-900" : "text-zinc-500"}
            onClick={() => setTab("versions")}
          >
            Versions
          </button>
          <button
            className={tab === "prompts" ? "font-semibold text-zinc-900" : "text-zinc-500"}
            onClick={() => setTab("prompts")}
          >
            Prompts
          </button>
        </div>
        {msg && <p className="text-sm text-red-600">{msg}</p>}

        {tab === "versions" ? (
          <div className="space-y-3">
            <div className="flex gap-2">
              <input
                value={label}
                onChange={(e) => setLabel(e.target.value)}
                placeholder="Version label (optional)"
                className="flex-1 rounded-md border border-zinc-200 px-2 py-1 text-sm outline-none"
              />
              <button
                onClick={save}
                disabled={pending}
                className="rounded-md bg-zinc-900 px-3 py-1 text-sm text-white transition-all active:scale-95 disabled:opacity-50"
              >
                Save current
              </button>
            </div>
            <ul className="space-y-1.5">
              {versions.map((v) => (
                <li
                  key={v.id}
                  className="flex items-center justify-between rounded-md border border-zinc-200 px-2.5 py-1.5 text-sm"
                >
                  <span>
                    {v.label}{" "}
                    <span className="text-xs text-zinc-400">
                      {new Date(v.createdAt).toLocaleString()}
                    </span>
                  </span>
                  <button
                    onClick={() => restore(v.id)}
                    disabled={pending}
                    className="text-xs text-brand-accent transition-colors hover:text-brand-accent-strong disabled:opacity-50"
                  >
                    Restore
                  </button>
                </li>
              ))}
              {versions.length === 0 && (
                <p className="text-sm text-muted-foreground">
                  No versions yet — “Save current” to snapshot the board.
                </p>
              )}
            </ul>
          </div>
        ) : (
          <ul className="space-y-2">
            {prompts.map((p) => (
              <li key={p.id} className="rounded-md border border-zinc-200 p-2 text-xs">
                <div className="mb-1 flex justify-between">
                  <span className="font-medium capitalize text-zinc-700">{p.kind}</span>
                  <span className="text-zinc-400">{new Date(p.createdAt).toLocaleString()}</span>
                </div>
                <div className="text-zinc-700">
                  <span className="text-zinc-400">prompt: </span>
                  {p.prompt.slice(0, 160)}
                </div>
              </li>
            ))}
            {prompts.length === 0 && (
              <p className="text-sm text-muted-foreground">No prompts recorded yet.</p>
            )}
          </ul>
        )}
      </DialogContent>
    </Dialog>
  );
}
