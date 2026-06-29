"use client";

import { useCallback } from "react";
import { Tldraw, getSnapshot, loadSnapshot, type Editor, type TLEditorSnapshot } from "tldraw";
import "tldraw/tldraw.css";
import { useDebouncedSaver } from "./use-autosave";
import { saveCanvasAction } from "@/app/p/[projectId]/canvas-actions";

export type WhiteboardInnerProps = {
  projectId: string;
  initial: Record<string, unknown> | null;
};

export default function WhiteboardInner({ projectId, initial }: WhiteboardInnerProps) {
  const saver = useDebouncedSaver(
    (snapshot) => saveCanvasAction(projectId, snapshot),
    1500,
  );

  const handleMount = useCallback(
    (editor: Editor) => {
      if (initial) {
        try {
          loadSnapshot(editor.store, initial as unknown as TLEditorSnapshot);
        } catch {
          // Corrupt/incompatible snapshot — fall back to local persisted state.
        }
      }
      const unsub = editor.store.listen(
        () => {
          const snap = getSnapshot(editor.store) as unknown as Record<string, unknown>;
          saver(snap);
        },
        { source: "user", scope: "document" },
      );
      return () => unsub();
    },
    [initial, saver],
  );

  return (
    <div className="absolute inset-0">
      <Tldraw persistenceKey={`ww-${projectId}`} onMount={handleMount} />
    </div>
  );
}
