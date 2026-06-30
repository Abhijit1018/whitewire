"use client";

import { useCallback, useState } from "react";
import { useWorkspaceStore } from "@/core/state/workspace-store";
import { Tldraw, getSnapshot, loadSnapshot, type Editor, type TLEditorSnapshot } from "tldraw";
import { getAssetUrls } from "@tldraw/assets/selfHosted";
import { AiNodeUtil } from "./shapes/ai-node-util";
import "tldraw/tldraw.css";
import { useDebouncedSaver } from "./use-autosave";
import { saveCanvasAction } from "@/app/p/[projectId]/canvas-actions";

const customShapeUtils = [AiNodeUtil];
const assetUrls = getAssetUrls({ baseUrl: "/tldraw" });
let mountCount = 0;

export type WhiteboardInnerProps = {
  projectId: string;
  initial: Record<string, unknown> | null;
};

export default function WhiteboardInner({ projectId, initial }: WhiteboardInnerProps) {
  const [status, setStatus] = useState("mounting…");
  const setSelection = useWorkspaceStore((s) => s.setSelection);
  const setEditor = useWorkspaceStore((s) => s.setEditor);
  const saveSnapshot = useCallback(
    (snapshot: Record<string, unknown>) => saveCanvasAction(projectId, snapshot),
    [projectId],
  );
  const saver = useDebouncedSaver(saveSnapshot, 1500);

  const handleMount = useCallback(
    (editor: Editor) => {
      mountCount++;
      const myMount = mountCount;
      setEditor(editor);
      const interval = setInterval(() => {
        try {
          const vb = editor.getViewportScreenBounds();
          const el = document.querySelector(".tl-container") as HTMLElement | null;
          const sh = editor.getCurrentPageShapes().length;
          setStatus(
            `m${myMount} vp=${Math.round(vb.w)}x${Math.round(vb.h)} cont=${el ? el.clientHeight : "?"} sh=${sh}`,
          );
        } catch (e) {
          setStatus("err: " + String(e));
        }
      }, 2000);
      const updateSel = () => {
        const ids = editor.getSelectedShapeIds();
        if (ids.length === 1) {
          const s = editor.getShape(ids[0]);
          if (s?.type === "ai-node") {
            const p = s.props as { text: string; kind: string };
            setSelection({ id: ids[0], text: p.text, kind: p.kind });
            return;
          }
        }
        setSelection({ id: null, text: "", kind: "" });
      };
      const unsubSel = editor.store.listen(updateSel, { scope: "session" });
      if (initial) {
        try {
          loadSnapshot(editor.store, initial as unknown as TLEditorSnapshot);
        } catch {
          // Corrupt/incompatible snapshot — start from an empty canvas.
        }
      }
      const unsub = editor.store.listen(
        () => saver(getSnapshot(editor.store) as unknown as Record<string, unknown>),
        { source: "user", scope: "document" },
      );
      return () => {
        unsub();
        unsubSel();
        setEditor(null);
        clearInterval(interval);
      };
    },
    [initial, saver, setSelection, setEditor],
  );

  return (
    <div className="absolute inset-0">
      <Tldraw onMount={handleMount} shapeUtils={customShapeUtils} assetUrls={assetUrls} />
      <div className="pointer-events-none absolute bottom-1 left-1 z-50 rounded bg-black/60 px-1.5 py-0.5 text-[10px] text-white">
        canvas: {status}
      </div>
    </div>
  );
}
