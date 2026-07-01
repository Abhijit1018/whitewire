"use client";

import { applyCleanup } from "./cleanup-adapter";
import { ExpandButton } from "./expand-button";
import { ArchitectPanel } from "./architect-panel";
import { HistoryPanel } from "./history-panel";

export function CanvasTools({ projectId }: { projectId: string }) {
  return (
    <div className="flex items-center gap-2">
      <ArchitectPanel projectId={projectId} />
      <HistoryPanel projectId={projectId} />
      <button
        type="button"
        onClick={() => applyCleanup()}
        className="rounded-md border border-zinc-200 px-3 py-1.5 text-sm transition-all hover:bg-zinc-100 active:scale-95"
      >
        Tidy up
      </button>
      <ExpandButton projectId={projectId} />
    </div>
  );
}
