"use client";

import { useCallback, useRef, useState } from "react";
import { Tldraw, getSnapshot, loadSnapshot, type Editor, type TLEditorSnapshot } from "tldraw";
import { AiNodeUtil } from "./shapes/ai-node-util";
import "tldraw/tldraw.css";
import { useDebouncedSaver } from "./use-autosave";
import { applyCleanup } from "./cleanup-adapter";
import { saveCanvasAction } from "@/app/p/[projectId]/canvas-actions";
import { CommandBar } from "./command-bar";
import { ExpandButton } from "./expand-button";

const customShapeUtils = [AiNodeUtil];

export type WhiteboardInnerProps = {
  projectId: string;
  initial: Record<string, unknown> | null;
};

export default function WhiteboardInner({ projectId, initial }: WhiteboardInnerProps) {
  const editorRef = useRef<Editor | null>(null);
  const [ready, setReady] = useState(false);
  const [selectedAiNodeId, setSelectedAiNodeId] = useState<string | null>(null);
  const saveSnapshot = useCallback(
    (snapshot: Record<string, unknown>) => saveCanvasAction(projectId, snapshot),
    [projectId],
  );
  const saver = useDebouncedSaver(saveSnapshot, 1500);

  const handleMount = useCallback(
    (editor: Editor) => {
      editorRef.current = editor;
      setReady(true);
      const updateSel = () => {
        const ids = editor.getSelectedShapeIds();
        if (ids.length === 1) {
          const s = editor.getShape(ids[0]);
          setSelectedAiNodeId(s?.type === "ai-node" ? ids[0] : null);
        } else {
          setSelectedAiNodeId(null);
        }
      };
      const unsubSel = editor.store.listen(updateSel, { scope: "session" });
      if (initial) {
        try {
          loadSnapshot(editor.store, initial as unknown as TLEditorSnapshot);
        } catch {
          // Corrupt/incompatible snapshot — fall back to local persisted state.
        }
      }
      const unsub = editor.store.listen(
        () => saver(getSnapshot(editor.store) as unknown as Record<string, unknown>),
        { source: "user", scope: "document" },
      );
      return () => {
        unsub();
        unsubSel();
      };
    },
    [initial, saver],
  );

  return (
    <div className="absolute inset-0">
      <Tldraw persistenceKey={`ww-${projectId}`} onMount={handleMount} shapeUtils={customShapeUtils} />
      <button
        type="button"
        onClick={() => editorRef.current && applyCleanup(editorRef.current)}
        className="absolute right-4 top-4 z-10 rounded-md bg-black px-3 py-1.5 text-sm text-white shadow"
      >
        Tidy up
      </button>
      {ready && editorRef.current && (
        <ExpandButton
          projectId={projectId}
          editor={editorRef.current}
          selectedAiNodeId={selectedAiNodeId}
        />
      )}
      {ready && <CommandBar projectId={projectId} editor={editorRef.current} />}
    </div>
  );
}
