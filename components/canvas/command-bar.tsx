"use client";

import { useState, useTransition } from "react";
import { createShapeId } from "tldraw";
import { useWorkspaceStore } from "@/core/state/workspace-store";
import { commandGenerateAction } from "@/app/p/[projectId]/ai-actions";

export function CommandBar({ projectId }: { projectId: string }) {
  const editor = useWorkspaceStore((s) => s.editor);
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
    <div className="flex w-full items-center gap-2">
      <input
        value={prompt}
        onChange={(e) => setPrompt(e.target.value)}
        onKeyDown={(e) => e.key === "Enter" && submit()}
        placeholder={editor ? "Ask AI to create a node…" : "Loading canvas…"}
        disabled={!editor}
        className="flex-1 rounded-md border bg-white px-3 py-1.5 text-sm outline-none disabled:opacity-50"
      />
      <button
        type="button"
        onClick={submit}
        disabled={pending || !editor}
        className="rounded-md bg-black px-4 py-1.5 text-sm text-white disabled:opacity-50"
      >
        {pending ? "Generating…" : "Generate"}
      </button>
      {error && <span className="text-sm text-red-600">{error}</span>}
    </div>
  );
}
