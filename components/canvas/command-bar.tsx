"use client";

import { useState, useTransition } from "react";
import { notify, notifyActionError } from "@/core/state/notify-store";
import { commandGenerateAction } from "@/app/p/[projectId]/ai-actions";
import { applyScene } from "./scene-adapter";

export function CommandBar({ projectId }: { projectId: string }) {
  const [prompt, setPrompt] = useState("");
  const [pending, startTransition] = useTransition();

  function submit() {
    if (!prompt.trim()) return;
    const text = prompt.trim();
    startTransition(async () => {
      try {
        const res = await commandGenerateAction(projectId, text);
        if (res.error) {
          notifyActionError(res.error, res.code);
          return;
        }
        if (!res.scene || res.scene.nodes.length === 0) return;
        // The scene arrives already sized and grouped, so it is placed as laid
        // out rather than pushed through the uniform grid tidy-up.
        applyScene(res.scene, { x: 120, y: 100 });
        setPrompt("");
      } catch (e) {
        notify({ kind: "error", message: e instanceof Error ? e.message : "Generation failed" });
      }
    });
  }

  return (
    <div className="flex w-full items-center gap-2">
      <input
        value={prompt}
        onChange={(e) => setPrompt(e.target.value)}
        onKeyDown={(e) => e.key === "Enter" && submit()}
        placeholder="Describe something — AI builds a connected board…"
        className="flex-1 rounded-md border border-border bg-surface px-3 py-1.5 text-sm outline-none transition-colors focus:border-primary"
      />
      <button
        type="button"
        onClick={submit}
        disabled={pending}
        className="rounded-md bg-gradient-brand px-4 py-1.5 text-sm text-white transition-all hover:opacity-90 active:scale-95 disabled:opacity-50"
      >
        {pending ? "Generating…" : "Generate"}
      </button>
    </div>
  );
}
