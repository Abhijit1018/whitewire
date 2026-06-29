"use client";

import { useCallback } from "react";
import { Tldraw, getSnapshot, loadSnapshot, type Editor, type TLEditorSnapshot } from "tldraw";
import "tldraw/tldraw.css";

export type WhiteboardInnerProps = {
  projectId: string;
  initial: Record<string, unknown> | null;
};

export default function WhiteboardInner({ projectId, initial }: WhiteboardInnerProps) {
  const handleMount = useCallback(
    (editor: Editor) => {
      if (initial) {
        try {
          loadSnapshot(editor.store, initial as unknown as TLEditorSnapshot);
        } catch {
          // Corrupt/incompatible snapshot — start from local persisted state instead.
        }
      }
    },
    [initial],
  );

  return (
    <div className="absolute inset-0">
      <Tldraw persistenceKey={`ww-${projectId}`} onMount={handleMount} />
    </div>
  );
}
