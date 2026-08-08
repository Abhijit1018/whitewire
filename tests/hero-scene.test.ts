import { describe, expect, it } from "vitest";
import { clearance, layout, well, wireRoutes } from "@/lib/hero-scene";

/**
 * The same two invariants the sandbox's `npm run hero:verify` asserts in real
 * Chrome (D:\clipcamp\whitewire\hero\shots.mjs), pinned here so a change to
 * the layout maths cannot regress them without a browser in the loop:
 *
 *   1. every card is fully inside the frame — nothing reads as "cut off"
 *   2. no card intrudes on the copy's well — nothing crosses the headline
 *
 * Sizes are DEVICE pixels, because that is what the canvas is sized in.
 * `well()` has absolute caps (430 × 290), so the layout is not scale
 * invariant and each ratio has to be checked at both DPRs it ships at.
 */
const VIEWPORTS: [name: string, w: number, h: number][] = [
  ["iphone-se", 375, 667],
  ["iphone-13", 390, 844],
  ["pixel-7", 412, 915],
  ["ipad-portrait", 768, 1024],
  ["ipad-landscape", 1024, 768],
  ["laptop", 1280, 800],
  ["desktop-1080p", 1920, 1080],
  ["macbook-16", 1728, 1117],
  ["ultrawide-2560", 2560, 1080],
  ["ultrawide-3440", 3440, 1440],
  // the synthetic edge cases are the ones that earn the claim — a band is
  // only proven by its worst case, not by a comfortable example
  ["edge-square", 1000, 1000],
  ["edge-just-portrait", 900, 901],
  ["edge-just-ultrawide", 1600, 799],
  ["edge-super-ultrawide", 3840, 1080],
  ["edge-short-window", 1440, 620],
];

/** A point on a quadratic bezier — the curve the wires are drawn as. */
function bez(p0: [number, number], c: [number, number], p1: [number, number], t: number) {
  const m = 1 - t;
  return [
    m * m * p0[0] + 2 * m * t * c[0] + t * t * p1[0],
    m * m * p0[1] + 2 * m * t * c[1] + t * t * p1[1],
  ] as const;
}

/** Half-extents of a card once its slight rotation is applied. */
function rotatedHalfExtents(w: number, h: number, rot: number) {
  const c = Math.abs(Math.cos(rot));
  const s = Math.abs(Math.sin(rot));
  return { hw: (w / 2) * c + (h / 2) * s, hh: (w / 2) * s + (h / 2) * c };
}

describe("hero scene layout", () => {
  for (const dpr of [1, 2]) {
    for (const [name, cw, ch] of VIEWPORTS) {
      const W = cw * dpr;
      const H = ch * dpr;

      it(`${name} @${dpr}x keeps every card inside the frame`, () => {
        const L = layout(W, H);
        for (const card of L.cards) {
          const { hw, hh } = rotatedHalfExtents(card.w, card.h, card.rot);
          const cx = card.x + card.w / 2;
          const cy = card.y + card.h / 2;
          expect(cx - hw, `${card.kind} left`).toBeGreaterThanOrEqual(0);
          expect(cy - hh, `${card.kind} top`).toBeGreaterThanOrEqual(0);
          expect(cx + hw, `${card.kind} right`).toBeLessThanOrEqual(W);
          expect(cy + hh, `${card.kind} bottom`).toBeLessThanOrEqual(H);
        }
      });

      it(`${name} @${dpr}x routes every wire clear of the copy`, () => {
        // Both ends of a wire can sit clear of the well while the middle sags
        // straight back through it — that is what put a stroke across the
        // trust row on a short window, at about 0.88.
        //
        // The bar is 0.95 rather than 1 because the bow is capped by the frame:
        // on a tall phone the outward direction runs into the top edge before
        // the curve is fully clear, and a stroke walking off the frame is a
        // worse failure than one grazing the copy.
        const L = layout(W, H);
        for (const { p0, c, p1 } of wireRoutes(L)) {
          for (let k = 0; k <= 64; k++) {
            const [x, y] = bez(p0, c, p1, k / 64);
            const u = Math.hypot((x - W / 2) / L.well.rx, (y - H / 2) / L.well.ry);
            expect(u, `${name} t=${(k / 64).toFixed(2)}`).toBeGreaterThanOrEqual(0.95);
          }
        }
      });

      it(`${name} @${dpr}x leaves the copy's well clear`, () => {
        const L = layout(W, H);
        for (const card of L.cards) {
          const c = clearance(
            card.x + card.w / 2 - W / 2,
            card.y + card.h / 2 - H / 2,
            card.w,
            card.h,
            L.well
          );
          expect(c, `${card.kind} clearance`).toBeGreaterThanOrEqual(1);
        }
      });
    }
  }

  it("switches to the stacked portrait board below 1.15 aspect", () => {
    // beside a phone there is no room, so the board goes above and below
    expect(layout(800, 1000).portrait).toBe(true);
    expect(layout(1149, 1000).portrait).toBe(true);
    expect(layout(1150, 1000).portrait).toBe(false);
  });

  it("caps the well so it can never eat the whole frame", () => {
    expect(well(400, 300)).toEqual({ rx: 200, ry: 126 });
    // absolute caps take over once the frame is big enough
    expect(well(4000, 3000)).toEqual({ rx: 430, ry: 290 });
  });

  it("takes a measured copy block over the guess, still clamped to the frame", () => {
    // the guess is a laptop-shaped 290; a phone's copy block is far taller,
    // and taking it at face value is what stops cards landing on the trust row
    expect(well(780, 1688, { rx: 300, ry: 700 })).toEqual({ rx: 300, ry: 700 });
    // but a runaway measurement can never take the whole frame
    expect(well(780, 1688, { rx: 9999, ry: 9999 })).toEqual({ rx: 390, ry: 776.48 });
  });

  describe("with a measured copy block", () => {
    /**
     * Shapes `measureWell` actually produces, as fractions of the frame. The
     * phone case is the one that matters: its block runs nearly the full
     * width and about a quarter of the height either side of centre, which is
     * roughly twice what the old fixed 290px guess allowed.
     */
    const HINTS: [name: string, rx: number, ry: number][] = [
      ["desktop copy", 0.32, 0.29],
      ["phone copy", 0.48, 0.27],
    ];

    for (const [hintName, fx, fy] of HINTS) {
      for (const [name, cw, ch] of VIEWPORTS) {
        it(`${name} + ${hintName} stays in frame and clear of the copy`, () => {
          const L = layout(cw, ch, { rx: cw * fx, ry: ch * fy });
          for (const card of L.cards) {
            const { hw, hh } = rotatedHalfExtents(card.w, card.h, card.rot);
            const cx = card.x + card.w / 2;
            const cy = card.y + card.h / 2;
            expect(cx - hw).toBeGreaterThanOrEqual(0);
            expect(cy - hh).toBeGreaterThanOrEqual(0);
            expect(cx + hw).toBeLessThanOrEqual(cw);
            expect(cy + hh).toBeLessThanOrEqual(ch);
            expect(
              clearance(cx - cw / 2, cy - ch / 2, card.w, card.h, L.well)
            ).toBeGreaterThanOrEqual(1);
          }
        });
      }
    }

    it("degrades rather than overflows when the well swallows the frame", () => {
      // past the point where a clear board can exist, the shrink loop bottoms
      // out. Cards must still stay inside the frame — better a cramped board
      // than one hanging off the edge.
      const L = layout(1280, 800, { rx: 5000, ry: 5000 });
      for (const card of L.cards) {
        const { hw, hh } = rotatedHalfExtents(card.w, card.h, card.rot);
        expect(card.x + card.w / 2 - hw).toBeGreaterThanOrEqual(0);
        expect(card.y + card.h / 2 - hh).toBeGreaterThanOrEqual(0);
        expect(card.x + card.w / 2 + hw).toBeLessThanOrEqual(1280);
        expect(card.y + card.h / 2 + hh).toBeLessThanOrEqual(800);
      }
    });
  });

  it("is deterministic — the same frame always lays out identically", () => {
    expect(layout(1280, 800)).toEqual(layout(1280, 800));
  });

  it("reports a card box that is never outside the well by less than nothing", () => {
    // a box straddling the centre has zero clearance; one clear of it has >= 1
    const w = well(1280, 800);
    expect(clearance(0, 0, 100, 100, w)).toBe(0);
    expect(clearance(w.rx + 200, 0, 100, 100, w)).toBeGreaterThan(1);
  });
});
