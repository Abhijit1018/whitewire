import { describe, it, expect, beforeEach } from "vitest";
import {
  useNotifyStore,
  notify,
  notifyActionError,
  isTransient,
} from "@/core/state/notify-store";

const notices = () => useNotifyStore.getState().notices;

beforeEach(() => useNotifyStore.getState().clear());

describe("notify store", () => {
  it("adds a notice and returns its id", () => {
    const id = notify({ kind: "error", message: "Boom" });
    expect(notices()).toHaveLength(1);
    expect(notices()[0]).toMatchObject({ id, kind: "error", message: "Boom" });
  });

  it("stacks notices that carry no dedupe code", () => {
    notify({ kind: "error", message: "One" });
    notify({ kind: "error", message: "Two" });
    expect(notices()).toHaveLength(2);
  });

  it("collapses repeated notices sharing a code", () => {
    const first = notify({ kind: "config", code: "no_key", message: "No key" });
    const second = notify({ kind: "config", code: "no_key", message: "Still no key" });
    expect(first).toBe(second);
    expect(notices()).toHaveLength(1);
    expect(notices()[0].message).toBe("Still no key");
  });

  it("dismisses by id", () => {
    const id = notify({ kind: "info", message: "Hi" });
    useNotifyStore.getState().dismiss(id);
    expect(notices()).toHaveLength(0);
  });
});

describe("isTransient", () => {
  it("auto-dismisses everything except config problems", () => {
    expect(isTransient("error")).toBe(true);
    expect(isTransient("info")).toBe(true);
    expect(isTransient("success")).toBe(true);
    expect(isTransient("config")).toBe(false);
  });
});

describe("notifyActionError", () => {
  it("turns a missing key into a sticky notice linking to settings", () => {
    notifyActionError("No active model.", "no_key");
    expect(notices()[0]).toMatchObject({
      kind: "config",
      code: "no_key",
      action: { label: "Add a key", href: "/settings" },
    });
  });

  it("treats an unavailable model as a config problem too", () => {
    notifyActionError("Model gone.", "no_model");
    expect(notices()[0].kind).toBe("config");
  });

  it("treats anything else as a transient error", () => {
    notifyActionError("Network died", "failed");
    expect(notices()[0]).toMatchObject({ kind: "error", message: "Network died" });
    expect(notices()[0].action).toBeUndefined();
  });
});
