import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createDebouncedSaver } from "@/components/canvas/use-autosave";

beforeEach(() => vi.useFakeTimers());
afterEach(() => vi.useRealTimers());

describe("createDebouncedSaver", () => {
  it("saves once after the delay for rapid calls", () => {
    const save = vi.fn();
    const saver = createDebouncedSaver(save, 1500);
    saver({ v: 1 });
    saver({ v: 2 });
    saver({ v: 3 });
    expect(save).not.toHaveBeenCalled();
    vi.advanceTimersByTime(1500);
    expect(save).toHaveBeenCalledTimes(1);
    expect(save).toHaveBeenCalledWith({ v: 3 });
  });

  it("does not save when the snapshot is unchanged since last save", () => {
    const save = vi.fn();
    const saver = createDebouncedSaver(save, 1000);
    saver({ v: 1 });
    vi.advanceTimersByTime(1000);
    expect(save).toHaveBeenCalledTimes(1);
    saver({ v: 1 });
    vi.advanceTimersByTime(1000);
    expect(save).toHaveBeenCalledTimes(1);
  });

  it("saves again when content changes after a prior save", () => {
    const save = vi.fn();
    const saver = createDebouncedSaver(save, 1000);
    saver({ v: 1 });
    vi.advanceTimersByTime(1000);
    saver({ v: 2 });
    vi.advanceTimersByTime(1000);
    expect(save).toHaveBeenCalledTimes(2);
  });
});
