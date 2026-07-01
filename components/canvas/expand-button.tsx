"use client";

import { useState, useTransition } from "react";
import type { Edge } from "@xyflow/react";
import { useWorkspaceStore, type AiNode } from "@/core/state/workspace-store";
import { expandAction } from "@/app/p/[projectId]/ai-actions";
import { applyCleanup } from "./cleanup-adapter";

export function ExpandButton({ projectId }: { projectId: string }) {
  const selectedNodeId = useWorkspaceStore((s) => s.selectedNodeId);
  const selectedNodeText = useWorkspaceStore((s) => s.selectedNodeText);
  const addNodesEdges = useWorkspaceStore((s) => s.addNodesEdges);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  if (!selectedNodeId) return null;

  function expand() {
    const parentId = selectedNodeId;
    const text = selectedNodeText;
    if (!parentId) return;
    startTransition(async () => {
      setError(null);
      try {
        const { items } = await expandAction(projectId, text);
        if (items.length === 0) {
          setError("Model returned no sub-items.");
          return;
        }
        const parent = useWorkspaceStore.getState().nodes.find((n) => n.id === parentId);
        const baseX = parent?.position.x ?? 0;
        const baseY = parent?.position.y ?? 0;
        const newNodes: AiNode[] = [];
        const newEdges: Edge[] = [];
        items.forEach((item, i) => {
          const id = crypto.randomUUID();
          newNodes.push({
            id,
            type: "aiNode",
            position: { x: baseX + i * 260, y: baseY + 200 },
            data: { text: item, kind: "generic", purpose: "", model: "" },
          });
          newEdges.push({ id: crypto.randomUUID(), source: parentId, target: id });
        });
        addNodesEdges(newNodes, newEdges);
        applyCleanup();
      } catch (e) {
        setError(e instanceof Error ? e.message : "Expand failed");
      }
    });
  }

  return (
    <span className="inline-flex items-center gap-2">
      <button
        type="button"
        onClick={expand}
        disabled={pending}
        className="rounded-md bg-indigo-600 px-3 py-1.5 text-sm text-white shadow disabled:opacity-50"
      >
        {pending ? "Expanding…" : "Expand"}
      </button>
      {error && <span className="text-sm text-red-600">{error}</span>}
    </span>
  );
}
