"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";

/**
 * A thin top progress bar that gives immediate feedback on navigation, so a
 * click never feels dead while the next route loads. Starts when an internal
 * link is clicked and completes when the pathname commits. Self-contained —
 * no dependency, and `usePathname` (unlike `useSearchParams`) keeps pages from
 * being forced dynamic.
 */
export function RouteProgress() {
  const pathname = usePathname();
  const [progress, setProgress] = useState(0);
  const [active, setActive] = useState(false);
  const tick = useRef<ReturnType<typeof setInterval> | null>(null);
  const hide = useRef<ReturnType<typeof setTimeout> | null>(null);

  function start() {
    if (active) return;
    if (hide.current) clearTimeout(hide.current);
    setActive(true);
    setProgress(8);
    tick.current = setInterval(() => {
      // Ease toward 90% and stall — the real completion snaps it to 100%.
      setProgress((p) => (p >= 90 ? p : p + (90 - p) * 0.12));
    }, 180);
  }

  function finish() {
    if (tick.current) clearInterval(tick.current);
    setProgress(100);
    hide.current = setTimeout(() => {
      setActive(false);
      setProgress(0);
    }, 260);
  }

  // Begin on internal-link clicks (covers nav, cards, CTAs).
  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey)
        return;
      const anchor = (e.target as HTMLElement)?.closest?.("a");
      if (!anchor) return;
      const href = anchor.getAttribute("href");
      const target = anchor.getAttribute("target");
      if (!href || target === "_blank" || href.startsWith("#") || href.startsWith("http") || href.startsWith("mailto:"))
        return;
      // Same-URL clicks won't change pathname, so nothing to wait on.
      if (href === pathname) return;
      start();
    }
    document.addEventListener("click", onClick);
    return () => document.removeEventListener("click", onClick);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname, active]);

  // Complete when the route commits.
  useEffect(() => {
    if (active) finish();
    return () => {
      if (tick.current) clearInterval(tick.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  if (!active && progress === 0) return null;

  return (
    <div className="pointer-events-none fixed inset-x-0 top-0 z-[100] h-0.5" aria-hidden>
      <div
        className="h-full bg-brand-accent shadow-[0_0_8px_0_var(--brand-accent)] transition-[width,opacity] duration-200 ease-out"
        style={{ width: `${progress}%`, opacity: active ? 1 : 0 }}
      />
    </div>
  );
}
