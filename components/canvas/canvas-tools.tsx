"use client";

import { useWorkspaceStore } from "@/core/state/workspace-store";
import { applyCleanup } from "./cleanup-adapter";
import { ExpandButton } from "./expand-button";

export function CanvasTools({ projectId }: { projectId: string }) {
  const editor = useWorkspaceStore((s) => s.editor);
  const selectedNodeId = useWorkspaceStore((s) => s.selectedNodeId);
  if (!editor) return null;

  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        onClick={() => applyCleanup(editor)}
        className="rounded-md border px-3 py-1.5 text-sm"
      >
        Tidy up
      </button>
      <ExpandButton projectId={projectId} editor={editor} selectedAiNodeId={selectedNodeId} />
    </div>
  );
}
