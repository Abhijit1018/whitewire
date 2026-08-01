"use client";

import { useTransition } from "react";
import { useWorkspaceStore } from "@/core/state/workspace-store";
import { notify, notifyActionError } from "@/core/state/notify-store";
import { expandAction } from "@/app/p/[projectId]/ai-actions";
import { applyScene } from "./scene-adapter";

export function ExpandButton({ projectId }: { projectId: string }) {
  const selectedNodeId = useWorkspaceStore((s) => s.selectedNodeId);
  const selectedNodeText = useWorkspaceStore((s) => s.selectedNodeText);
  const [pending, startTransition] = useTransition();

  if (!selectedNodeId) return null;

  function expand() {
    const parentId = selectedNodeId;
    const text = selectedNodeText;
    if (!parentId) return;
    startTransition(async () => {
      try {
        const res = await expandAction(projectId, text);
        if (res.error) {
          notifyActionError(res.error, res.code);
          return;
        }
        if (!res.scene || res.scene.nodes.length === 0) {
          notify({ kind: "info", message: "Model returned no sub-items." });
          return;
        }
        const parent = useWorkspaceStore.getState().nodes.find((n) => n.id === parentId);
        applyScene(
          res.scene,
          { x: parent?.position.x ?? 0, y: (parent?.position.y ?? 0) + 220 },
          { connectFrom: parentId },
        );
      } catch (e) {
        notify({ kind: "error", message: e instanceof Error ? e.message : "Expand failed" });
      }
    });
  }

  return (
    <button
      type="button"
      onClick={expand}
      disabled={pending}
      className="rounded-md bg-brand-accent px-3 py-1.5 text-sm text-white shadow transition-all hover:bg-brand-accent-strong active:scale-95 disabled:opacity-50"
    >
      {pending ? "Expanding…" : "Expand"}
    </button>
  );
}
