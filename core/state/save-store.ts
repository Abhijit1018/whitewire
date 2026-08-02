import { create } from "zustand";

export type SaveStatus = "idle" | "saving" | "saved" | "error";

type SaveState = {
  status: SaveStatus;
  setStatus: (status: SaveStatus) => void;
};

/**
 * Surfaces autosave so the board doesn't look unsaved. There is no save button
 * because every change is persisted; this is the feedback that says so.
 */
export const useSaveStore = create<SaveState>((set) => ({
  status: "idle",
  setStatus: (status) => set({ status }),
}));

let settleTimer: ReturnType<typeof setTimeout> | null = null;

/** Marks a save in flight, then settles to "saved" (or "error") when it lands. */
export async function trackSave(save: () => Promise<unknown> | unknown): Promise<void> {
  const { setStatus } = useSaveStore.getState();
  if (settleTimer) clearTimeout(settleTimer);
  setStatus("saving");
  try {
    await save();
    setStatus("saved");
    // Fade back to idle so a stale "Saved" doesn't imply a recent change.
    settleTimer = setTimeout(() => useSaveStore.getState().setStatus("idle"), 2500);
  } catch {
    setStatus("error");
  }
}
