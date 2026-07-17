"use client";

import { useEffect, useMemo, useRef, useState, type RefObject } from "react";
import { useFloatingPanelsStore } from "@/core/state/floating-panels-store";
import { rectsIntersect, type Rect } from "@/core/canvas/geometry";

export type CollisionDodge = {
  /** True whenever a header dropdown overlaps the toolbar's expanded rect. */
  collapsed: boolean;
  /** Stable key of the currently-open panel set; changes when panels open/close. */
  openPanelKey: string;
};

/**
 * Watches the open header-dropdown rects and reports whether the floating
 * toolbar (measured at its natural expanded size) overlaps any of them.
 * The toolbar's rest rect is only re-measured while NOT collapsed, so the
 * decision is always based on the expanded footprint — the in-place shrink
 * can't feed back and cause oscillation.
 */
export function useCollisionDodge(toolbarRef: RefObject<HTMLElement | null>): CollisionDodge {
  const [collapsed, setCollapsed] = useState(false);
  const restRectRef = useRef<Rect | null>(null);
  const panelRects = useFloatingPanelsStore((s) => s.panelRects);

  const openPanelKey = useMemo(
    () => Object.keys(panelRects).sort().join(","),
    [panelRects],
  );

  useEffect(() => {
    if (collapsed) return;
    const el = toolbarRef.current;
    if (!el) return;

    function measure() {
      const r = el!.getBoundingClientRect();
      restRectRef.current = { x: r.x, y: r.y, width: r.width, height: r.height };
    }

    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    window.addEventListener("resize", measure);
    return () => {
      observer.disconnect();
      window.removeEventListener("resize", measure);
    };
  }, [collapsed, toolbarRef]);

  useEffect(() => {
    const rest = restRectRef.current;
    if (!rest) {
      setCollapsed(false);
      return;
    }
    const hit = Object.values(panelRects).some((r) => rectsIntersect(rest, r));
    setCollapsed(hit);
  }, [panelRects]);

  return { collapsed, openPanelKey };
}
