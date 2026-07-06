"use client";

import { useState, useTransition } from "react";
import { Share2, Check, Copy } from "lucide-react";
import { Dialog, DialogContent, DialogTrigger, DialogTitle } from "@/components/ui/dialog";
import { setSharingAction } from "@/app/p/[projectId]/share-actions";
import { cn } from "@/lib/utils";

export function ShareDialog({
  projectId,
  isOwner,
  shareEnabled,
  shareRole,
}: {
  projectId: string;
  isOwner: boolean;
  shareEnabled: boolean;
  shareRole: "editor" | "viewer";
}) {
  const [open, setOpen] = useState(false);
  const [enabled, setEnabled] = useState(shareEnabled);
  const [role, setRole] = useState<"editor" | "viewer">(shareRole);
  const [copied, setCopied] = useState(false);
  const [, startTransition] = useTransition();

  function update(nextEnabled: boolean, nextRole: "editor" | "viewer") {
    setEnabled(nextEnabled);
    setRole(nextRole);
    startTransition(async () => {
      await setSharingAction(projectId, nextEnabled, nextRole);
    });
  }

  function copyLink() {
    const url = `${window.location.origin}/p/${projectId}`;
    navigator.clipboard?.writeText(url).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <button className="inline-flex items-center gap-1.5 rounded-md bg-brand-accent px-3 py-1.5 text-sm font-medium text-white transition-all hover:opacity-90 active:scale-95" />
        }
      >
        <Share2 className="size-3.5" /> Share
      </DialogTrigger>
      <DialogContent>
        <DialogTitle>Share this board</DialogTitle>

        {isOwner ? (
          <div className="space-y-4">
            <label className="flex cursor-pointer items-center justify-between gap-3 rounded-lg border border-border p-3">
              <span className="text-sm">
                <span className="font-medium text-foreground">Anyone with the link</span>
                <span className="block text-xs text-muted-foreground">
                  Let others open this board with the link
                </span>
              </span>
              <input
                type="checkbox"
                checked={enabled}
                onChange={(e) => update(e.target.checked, role)}
                className="size-4 accent-[var(--brand-accent)]"
              />
            </label>

            {enabled && (
              <div className="flex gap-2">
                {(["editor", "viewer"] as const).map((r) => (
                  <button
                    key={r}
                    type="button"
                    onClick={() => update(true, r)}
                    className={cn(
                      "flex-1 rounded-md border px-3 py-2 text-sm transition-colors active:scale-[0.98]",
                      role === r
                        ? "border-brand-accent bg-brand-accent/10 text-foreground"
                        : "border-border text-muted-foreground hover:bg-muted",
                    )}
                  >
                    Can {r === "editor" ? "edit" : "view"}
                  </button>
                ))}
              </div>
            )}

            <button
              type="button"
              onClick={copyLink}
              disabled={!enabled}
              className="flex w-full items-center justify-center gap-2 rounded-md border border-border py-2 text-sm font-medium transition-colors hover:bg-muted active:scale-[0.99] disabled:opacity-50"
            >
              {copied ? (
                <>
                  <Check className="size-4" /> Copied
                </>
              ) : (
                <>
                  <Copy className="size-4" /> Copy link
                </>
              )}
            </button>
            {!enabled && (
              <p className="text-xs text-muted-foreground">
                Sharing is off. Only you can open this board.
              </p>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              You&apos;re collaborating on this board. Share the link with others who have access.
            </p>
            <button
              type="button"
              onClick={copyLink}
              className="flex w-full items-center justify-center gap-2 rounded-md border border-border py-2 text-sm font-medium transition-colors hover:bg-muted active:scale-[0.99]"
            >
              {copied ? (
                <>
                  <Check className="size-4" /> Copied
                </>
              ) : (
                <>
                  <Copy className="size-4" /> Copy link
                </>
              )}
            </button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
