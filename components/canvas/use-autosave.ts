"use client";

import { useMemo } from "react";

type Snapshot = Record<string, unknown>;

/** Framework-free debouncer: coalesces rapid calls, skips unchanged snapshots. */
export function createDebouncedSaver(
  save: (snapshot: Snapshot) => void | Promise<void>,
  delay = 1500,
) {
  let timer: ReturnType<typeof setTimeout> | null = null;
  let lastSavedJson = "";
  let pending: Snapshot | null = null;
  let pendingJson = "";

  return (snapshot: Snapshot) => {
    const json = JSON.stringify(snapshot);
    if (json === lastSavedJson) return;
    pending = snapshot;
    pendingJson = json;
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => {
      timer = null;
      const snap = pending as Snapshot;
      const snapJson = pendingJson;
      const prev = lastSavedJson;
      lastSavedJson = snapJson; // optimistic: keeps dedup synchronous
      Promise.resolve(save(snap)).catch(() => {
        // Save failed — roll back so an identical later edit can retry.
        if (lastSavedJson === snapJson) lastSavedJson = prev;
      });
    }, delay);
  };
}

/** React wrapper: stable saver for the component lifetime. */
export function useDebouncedSaver(
  save: (snapshot: Snapshot) => void | Promise<void>,
  delay = 1500,
) {
  return useMemo(() => createDebouncedSaver(save, delay), [save, delay]);
}
