import { describe, expect, it } from "vitest";
import { getHelperLines, type HLNode } from "@/core/canvas/helper-lines";

const target: HLNode = { id: "t", x: 100, y: 100, width: 80, height: 40 };

describe("getHelperLines", () => {
  it("snaps left edges when within threshold", () => {
    // dragged left at 103, target left at 100 → within 5px
    const r = getHelperLines({ id: "d", x: 103, y: 300, width: 50, height: 30 }, [target]);
    expect(r.vertical).toBe(100);
    expect(r.snapX).toBe(100);
  });

  it("snaps horizontal centers when within threshold", () => {
    // target center-y = 120; dragged height 30 so its cy = y+15; y=103 → cy=118 (2px off)
    const r = getHelperLines({ id: "d", x: 400, y: 103, width: 50, height: 30 }, [target]);
    expect(r.horizontal).toBe(120);
    expect(r.snapY).toBe(105); // y so that cy=120 → y = 120 - 15
  });

  it("snaps right-to-left (dragged right edge meets target left edge)", () => {
    // target left = 100; dragged right should meet it → dragged x = 100 - width
    // dragged right = x+width; put x=48,width=50 → right=98 (2px from 100)
    const r = getHelperLines({ id: "d", x: 48, y: 300, width: 50, height: 30 }, [target]);
    expect(r.vertical).toBe(100);
    expect(r.snapX).toBe(50); // right(=x+50) aligns to 100 → x=50
  });

  it("returns empty when nothing is within threshold", () => {
    const r = getHelperLines({ id: "d", x: 500, y: 500, width: 50, height: 30 }, [target]);
    expect(r).toEqual({});
  });

  it("ignores the dragged node itself", () => {
    const r = getHelperLines({ ...target }, [target]);
    expect(r).toEqual({});
  });

  it("picks the closest of several candidates", () => {
    const near: HLNode = { id: "n", x: 102, y: 300, width: 80, height: 40 };
    const far: HLNode = { id: "f", x: 130, y: 300, width: 80, height: 40 };
    // dragged left = 104: near.left=102 (2px) beats far.left=130
    const r = getHelperLines({ id: "d", x: 104, y: 300, width: 50, height: 30 }, [far, near]);
    expect(r.vertical).toBe(102);
  });
});
