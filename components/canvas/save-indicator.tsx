"use client";

import { Check, CloudOff, Loader2 } from "lucide-react";
import { useSaveStore } from "@/core/state/save-store";

/**
 * Autosave feedback. There is deliberately no save button — every change is
 * persisted — so this is what tells the user their work is safe.
 */
export function SaveIndicator() {
  const status = useSaveStore((s) => s.status);
  if (status === "idle") return null;

  if (status === "error") {
    return (
      <span className="flex items-center gap-1 text-xs text-destructive" role="status">
        <CloudOff className="size-3.5" />
        Not saved
      </span>
    );
  }

  return (
    <span className="flex items-center gap-1 text-xs text-muted-foreground" role="status">
      {status === "saving" ? (
        <>
          <Loader2 className="size-3.5 animate-spin" />
          Saving…
        </>
      ) : (
        <>
          <Check className="size-3.5" />
          Saved
        </>
      )}
    </span>
  );
}
