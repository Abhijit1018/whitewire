"use client";

import { useCallback, useEffect, useState } from "react";

const KEY = "whitewire:plugins:v1";
const EVENT = "whitewire:plugins-changed";

function read(): string[] {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as string[]) : [];
  } catch {
    return [];
  }
}

function write(ids: string[]) {
  try {
    localStorage.setItem(KEY, JSON.stringify(ids));
  } catch {
    // ignore
  }
  window.dispatchEvent(new Event(EVENT));
}

/**
 * Per-browser install state for plugins. Persisted to localStorage and synced
 * across mounted components (marketplace grid ↔ canvas launcher) via a window
 * event, plus the native `storage` event for other tabs.
 */
export function useInstalledPlugins() {
  const [ids, setIds] = useState<string[]>([]);

  useEffect(() => {
    setIds(read());
    const sync = () => setIds(read());
    window.addEventListener(EVENT, sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener(EVENT, sync);
      window.removeEventListener("storage", sync);
    };
  }, []);

  const install = useCallback((id: string) => {
    const next = Array.from(new Set([...read(), id]));
    write(next);
  }, []);

  const uninstall = useCallback((id: string) => {
    write(read().filter((x) => x !== id));
  }, []);

  const isInstalled = useCallback((id: string) => ids.includes(id), [ids]);

  return { ids, install, uninstall, isInstalled };
}
