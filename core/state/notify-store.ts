import { create } from "zustand";

export type NoticeKind = "error" | "info" | "success" | "config";

export type NoticeAction = { label: string; href: string };

export type Notice = {
  id: string;
  kind: NoticeKind;
  message: string;
  action?: NoticeAction;
  /** Dedupe key. Two config notices sharing a code collapse into one. */
  code?: string;
};

export type NoticeInput = Omit<Notice, "id">;

/** Transient notices fade on their own; config notices need the user to act. */
export function isTransient(kind: NoticeKind): boolean {
  return kind !== "config";
}

type NotifyState = {
  notices: Notice[];
  notify: (input: NoticeInput) => string;
  dismiss: (id: string) => void;
  clear: () => void;
};

let counter = 0;
function nextId(): string {
  counter += 1;
  return `n${counter}`;
}

export const useNotifyStore = create<NotifyState>((set, get) => ({
  notices: [],

  notify: (input) => {
    // A repeated config error (no key, no model) should not stack up — five
    // failed actions are one problem, so reuse the existing notice.
    if (input.code) {
      const existing = get().notices.find((n) => n.code === input.code);
      if (existing) {
        set({
          notices: get().notices.map((n) =>
            n.id === existing.id ? { ...n, ...input, id: existing.id } : n,
          ),
        });
        return existing.id;
      }
    }
    const id = nextId();
    set({ notices: [...get().notices, { ...input, id }] });
    return id;
  },

  dismiss: (id) => set({ notices: get().notices.filter((n) => n.id !== id) }),

  clear: () => set({ notices: [] }),
}));

/** Imperative helper for call sites outside React render (actions, handlers). */
export function notify(input: NoticeInput): string {
  return useNotifyStore.getState().notify(input);
}

/**
 * Turns a server action failure into a notice. Config problems (missing key or
 * model) become a sticky notice with a link to Settings; everything else is a
 * transient error toast.
 */
export function notifyActionError(error: string, code?: string): string {
  if (code === "no_key" || code === "no_model") {
    return notify({
      kind: "config",
      code,
      message: error,
      action: { label: "Add a key", href: "/settings" },
    });
  }
  return notify({ kind: "error", message: error });
}
