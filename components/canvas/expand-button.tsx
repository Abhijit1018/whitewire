"use client";

import { useState, useTransition } from "react";
import { type Editor, createShapeId } from "tldraw";
import { expandAction } from "@/app/p/[projectId]/ai-actions";
import { applyCleanup } from "./cleanup-adapter";

export function ExpandButton({
  projectId,
  editor,
  selectedAiNodeId,
}: {
  projectId: string;
  editor: Editor;
  selectedAiNodeId: string | null;
}) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  if (!selectedAiNodeId) return null;

  function expand() {
    const parent = editor.getShape(selectedAiNodeId as never);
    if (!parent || parent.type !== "ai-node") return;
    const parentText = (parent.props as { text: string }).text;
    startTransition(async () => {
      setError(null);
      try {
        const { items } = await expandAction(projectId, parentText);
        if (items.length === 0) {
          setError("Model returned no sub-items.");
          return;
        }
        const baseX = (parent as { x: number }).x;
        const baseY = (parent as { y: number }).y;
        items.forEach((item, i) => {
          const childId = createShapeId();
          editor.createShape({
            id: childId,
            type: "ai-node",
            x: baseX + i * 260,
            y: baseY + 220,
            props: { text: item, kind: "generic", purpose: "", model: "" },
          });
          const arrowId = createShapeId();
          editor.createShape({ id: arrowId, type: "arrow", x: 0, y: 0 });
          editor.createBindings([
            {
              type: "arrow" as const,
              fromId: arrowId,
              toId: parent.id,
              props: {
                terminal: "start" as const,
                normalizedAnchor: { x: 0.5, y: 0.5 },
                isExact: false,
                isPrecise: false,
              },
            },
            {
              type: "arrow" as const,
              fromId: arrowId,
              toId: childId,
              props: {
                terminal: "end" as const,
                normalizedAnchor: { x: 0.5, y: 0.5 },
                isExact: false,
                isPrecise: false,
              },
            },
          ]);
        });
        applyCleanup(editor);
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
