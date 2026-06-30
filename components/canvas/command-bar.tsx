"use client";

import { useState, useTransition } from "react";
import type { Editor } from "tldraw";
import { createShapeId } from "tldraw";
import { commandGenerateAction } from "@/app/p/[projectId]/ai-actions";

export function CommandBar({
  projectId,
  editor,
}: {
  projectId: string;
  editor: Editor | null;
}) {
  const [prompt, setPrompt] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function submit() {
    if (!editor || !prompt.trim()) return;
    const text = prompt.trim();
    startTransition(async () => {
      setError(null);
      try {
        const { text: generated } = await commandGenerateAction(projectId, text);
        const center = editor.getViewportPageBounds().center;
        editor.createShape({
          id: createShapeId(),
          type: "ai-node",
          x: center.x - 110,
          y: center.y - 50,
          props: { text: generated, kind: "generic", purpose: "", model: "" },
        });
        setPrompt("");
      } catch (e) {
        setError(e instanceof Error ? e.message : "Generation failed");
      }
    });
  }

  return (
    <div className="absolute bottom-4 left-1/2 z-10 w-[min(90%,640px)] -translate-x-1/2">
      {error && (
        <p className="mb-1 rounded bg-red-50 px-3 py-1 text-sm text-red-600">{error}</p>
      )}
      <div className="flex gap-2 rounded-lg border bg-white p-2 shadow">
        <input
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && submit()}
          placeholder="Ask AI to create a node…"
          className="flex-1 px-2 py-1 outline-none"
        />
        <button
          type="button"
          onClick={submit}
          disabled={pending}
          className="rounded-md bg-black px-4 py-1.5 text-sm text-white disabled:opacity-50"
        >
          {pending ? "Generating…" : "Generate"}
        </button>
      </div>
    </div>
  );
}
