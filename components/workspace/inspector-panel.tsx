"use client";

import { useState } from "react";
import { Inspector } from "./inspector";

export function InspectorPanel({ projectId }: { projectId: string }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <aside
        className="hidden w-72 shrink-0 overflow-hidden border-l p-4 md:block"
        aria-label="Inspector"
      >
        <Inspector projectId={projectId} />
      </aside>

      <button
        type="button"
        onClick={() => setOpen(true)}
        className="fixed bottom-20 right-4 z-30 rounded-full bg-zinc-900 px-4 py-2 text-sm text-white shadow-lg transition-transform active:scale-95 md:hidden"
      >
        Inspect
      </button>

      {open && (
        <div className="fixed inset-0 z-40 flex flex-col bg-white md:hidden">
          <div className="flex items-center justify-between border-b p-3">
            <span className="font-medium">Inspector</span>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="rounded px-2 py-1 text-sm text-zinc-500 hover:bg-zinc-100"
            >
              Close
            </button>
          </div>
          <div className="flex-1 overflow-y-auto p-4">
            <Inspector projectId={projectId} />
          </div>
        </div>
      )}
    </>
  );
}
