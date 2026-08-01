"use client";

import { useState, useTransition } from "react";
import type { Edge } from "@xyflow/react";
import { useWorkspaceStore, type AiNode } from "@/core/state/workspace-store";
import { notify, notifyActionError } from "@/core/state/notify-store";
import { commandGenerateAction } from "@/app/p/[projectId]/ai-actions";
import { applyCleanup } from "./cleanup-adapter";

export function CommandBar({ projectId }: { projectId: string }) {
  const addNodesEdges = useWorkspaceStore((s) => s.addNodesEdges);
  const [prompt, setPrompt] = useState("");
  const [pending, startTransition] = useTransition();

  function submit() {
    if (!prompt.trim()) return;
    const text = prompt.trim();
    startTransition(async () => {
      try {
        const res = await commandGenerateAction(projectId, text);
        if (res.error) {
          notifyActionError(res.error, res.code);
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
        setPrompt("");
      } catch (e) {
        notify({ kind: "error", message: e instanceof Error ? e.message : "Generation failed" });
      }
    });
  }

  return (
    <div className="flex w-full items-center gap-2">
      <input
        value={prompt}
        onChange={(e) => setPrompt(e.target.value)}
        onKeyDown={(e) => e.key === "Enter" && submit()}
        placeholder="Describe something — AI builds a connected board…"
        className="flex-1 rounded-md border border-border bg-surface px-3 py-1.5 text-sm outline-none transition-colors focus:border-primary"
      />
      <button
        type="button"
        onClick={submit}
        disabled={pending}
        className="rounded-md bg-gradient-brand px-4 py-1.5 text-sm text-white transition-all hover:opacity-90 active:scale-95 disabled:opacity-50"
      >
        {pending ? "Generating…" : "Generate"}
      </button>
    </div>
  );
}
