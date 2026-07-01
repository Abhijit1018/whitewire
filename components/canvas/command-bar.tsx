"use client";

import { useState, useTransition } from "react";
import { useWorkspaceStore } from "@/core/state/workspace-store";
import { commandGenerateAction } from "@/app/p/[projectId]/ai-actions";

export function CommandBar({ projectId }: { projectId: string }) {
  const addNode = useWorkspaceStore((s) => s.addNode);
  const [prompt, setPrompt] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function submit() {
    if (!prompt.trim()) return;
    const text = prompt.trim();
    startTransition(async () => {
      setError(null);
      try {
        const res = await commandGenerateAction(projectId, text);
        if (res.error) {
          setError(res.error);
          return;
        }
        const count = useWorkspaceStore.getState().nodes.length;
        addNode({
          id: crypto.randomUUID(),
          type: "aiNode",
          position: { x: 120 + (count % 5) * 60, y: 100 + count * 30 },
          data: { text: res.text ?? "", kind: "generic", purpose: "", model: "" },
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
        placeholder="Ask AI to create a node…"
        className="flex-1 rounded-md border bg-white px-3 py-1.5 text-sm outline-none"
      />
      <button
        type="button"
        onClick={submit}
        disabled={pending}
        className="rounded-md bg-black px-4 py-1.5 text-sm text-white disabled:opacity-50"
      >
        {pending ? "Generating…" : "Generate"}
      </button>
      {error && <span className="text-sm text-red-600">{error}</span>}
    </div>
  );
}
