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

  return (snapshot: Snapshot) => {
    const json = JSON.stringify(snapshot);
    if (json === lastSavedJson) return;
    pending = snapshot;
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => {
      timer = null;
      lastSavedJson = JSON.stringify(pending);
      void save(pending as Snapshot);
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
