"use client";

import { applyCleanup } from "./cleanup-adapter";
import { ExpandButton } from "./expand-button";

export function CanvasTools({ projectId }: { projectId: string }) {
  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        onClick={() => applyCleanup()}
        className="rounded-md border px-3 py-1.5 text-sm"
      >
        Tidy up
      </button>
      <ExpandButton projectId={projectId} />
    </div>
  );
}
