"use client";

import { useEffect, useRef } from "react";
import { useFloatingPanelsStore } from "@/core/state/floating-panels-store";

/**
 * Attach the returned ref to a header dropdown panel's container `<div>`.
 * While `isOpen`, keeps that panel's live screen rect pushed into the
 * floating-panels store under `id`; on close or unmount, removes it.
 */
export function useFloatingPanelRect(id: string, isOpen: boolean) {
  const ref = useRef<HTMLDivElement>(null);
  const setPanelRect = useFloatingPanelsStore((s) => s.setPanelRect);

  useEffect(() => {
    if (!isOpen) {
      setPanelRect(id, null);
      return;
    }
    const el = ref.current;
    if (!el) return;

    function measure() {
      const r = el!.getBoundingClientRect();
      setPanelRect(id, { x: r.x, y: r.y, width: r.width, height: r.height });
    }

    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    window.addEventListener("resize", measure);
    window.addEventListener("scroll", measure, true);

    return () => {
      observer.disconnect();
      window.removeEventListener("resize", measure);
      window.removeEventListener("scroll", measure, true);
      setPanelRect(id, null);
    };
  }, [id, isOpen, setPanelRect]);

  return ref;
}
