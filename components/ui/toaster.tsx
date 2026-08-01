"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { X, AlertCircle, CheckCircle2, Info, KeyRound } from "lucide-react";
import { cn } from "@/lib/utils";
import { useNotifyStore, isTransient, type Notice } from "@/core/state/notify-store";

const AUTO_DISMISS_MS = 6000;

const ICONS = {
  error: AlertCircle,
  info: Info,
  success: CheckCircle2,
  config: KeyRound,
} as const;

const TONES = {
  error: "border-destructive/30 bg-destructive/10 text-destructive",
  info: "border-border bg-card text-foreground",
  success: "border-emerald-500/30 bg-emerald-500/10 text-emerald-700",
  config: "border-brand-accent/30 bg-brand-accent/10 text-brand-accent",
} as const;

function NoticeCard({ notice }: { notice: Notice }) {
  const dismiss = useNotifyStore((s) => s.dismiss);
  const [paused, setPaused] = useState(false);
  // Time already spent visible, so hovering pauses the countdown instead of
  // restarting it.
  const elapsed = useRef(0);

  useEffect(() => {
    if (!isTransient(notice.kind) || paused) return;
    const startedAt = Date.now();
    const remaining = Math.max(0, AUTO_DISMISS_MS - elapsed.current);
    const timer = setTimeout(() => dismiss(notice.id), remaining);
    return () => {
      elapsed.current += Date.now() - startedAt;
      clearTimeout(timer);
    };
  }, [notice.id, notice.kind, paused, dismiss]);

  const Icon = ICONS[notice.kind];

  return (
    <div
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      className={cn(
        "pointer-events-auto flex w-80 items-start gap-2.5 rounded-lg border p-3 text-sm shadow-lg backdrop-blur",
        "animate-in slide-in-from-bottom-2 fade-in duration-200",
        TONES[notice.kind],
      )}
    >
      <Icon className="mt-0.5 size-4 shrink-0" />
      <div className="min-w-0 flex-1">
        <p className="break-words">{notice.message}</p>
        {notice.action && (
          <Link
            href={notice.action.href}
            onClick={() => dismiss(notice.id)}
            className="mt-1.5 inline-block font-medium underline underline-offset-2"
          >
            {notice.action.label} →
          </Link>
        )}
      </div>
      <button
        type="button"
        onClick={() => dismiss(notice.id)}
        aria-label="Dismiss"
        className="shrink-0 rounded p-0.5 opacity-60 transition-opacity hover:opacity-100"
      >
        <X className="size-3.5" />
      </button>
    </div>
  );
}

/**
 * Fixed, portalled notice stack. Kept out of the document flow on purpose —
 * errors used to render inline inside toolbars and shift their layout.
 */
export function Toaster() {
  const notices = useNotifyStore((s) => s.notices);
  // Portals need a DOM. The server snapshot is false, the client snapshot true,
  // so this mounts after hydration without a setState-in-effect.
  const mounted = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );

  if (!mounted) return null;

  return createPortal(
    <div
      role="status"
      aria-live="polite"
      className="pointer-events-none fixed bottom-4 right-4 z-[100] flex flex-col-reverse gap-2"
    >
      {notices.map((n) => (
        <NoticeCard key={n.id} notice={n} />
      ))}
    </div>,
    document.body,
  );
}
