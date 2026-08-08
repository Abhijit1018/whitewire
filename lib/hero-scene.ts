/* ------------------------------------------------------------------ *\
   hero-scene.ts — the landing hero backdrop, drawn to any 2D context at
   any size.

   Ported from the sandbox at D:\clipcamp\whitewire\hero (loop/scene.js),
   which is still the factory: it renders the fallback videos in
   public/hero/ and verifies the layout across 15 viewports. Keep the two
   in step — the sandbox's shots.mjs asserts the same `clearance()` this
   file computes.

   Because the live canvas sizes itself to its container, the layout is
   computed from the ACTUAL width and height rather than authored at one
   aspect and cropped. Nothing is ever cropped, because nothing is ever
   laid out for a different frame than the one it is drawn into.

   THE CENTRE WELL. The headline block is up to 736px wide — wider than any
   sensibly-sized centred safe box — so a board laid out around the frame's
   centre will always collide with the copy. Every element here is pushed
   OUTSIDE an elliptical well sized to the text, and the well is left
   deliberately empty.

   Determinism: draw() is a pure function of (p, W, H, pointer). With no
   pointer it is fully deterministic, which is what lets the sandbox render
   a frame-exact video from the same code.
\* ------------------------------------------------------------------ */

const TAU = Math.PI * 2;

/** Seconds per loop cycle. Must match the rendered fallbacks. */
export const PERIOD = 12;

type RGB = readonly [number, number, number];

/* sRGB conversions of the exact oklch() the product ships in app/globals.css */
export const C = {
  bg: [250, 246, 240],
  ink: [24, 19, 16],
  card: [255, 253, 250],
  border: [229, 225, 221],
  muted: [119, 111, 106],
  accent: [177, 82, 41],
  accentWarm: [177, 101, 55],
  accentDeep: [159, 67, 37],
  grid: [212, 208, 205],
  note: [249, 214, 191],
  noteInk: [138, 74, 44],
  // collaborator tints — the same three the product's canvas mock uses
  peerA: [186, 96, 55],
  peerB: [66, 129, 90],
  peerC: [50, 102, 154],
} as const satisfies Record<string, RGB>;

export const rgba = (c: RGB, a: number) => `rgba(${c[0]}, ${c[1]}, ${c[2]}, ${a})`;

/* ----------------------------------------------------------------------
   Font families.

   The sandbox names its faces literally ("Geist", "Caveat"). Under
   next/font the real families are hashed — `__Geist_1a2b3c` — so canvas
   fillText would silently fall back to a system face if we hardcoded the
   plain names. The host component reads the CSS variables and injects the
   real stacks here before the first paint.
   ---------------------------------------------------------------------- */
const FAMILY = {
  ui: "Geist, system-ui, -apple-system, sans-serif",
  mono: "GeistMono, ui-monospace, monospace",
  hand: 'Caveat, "Segoe Script", cursive',
};

export function setFonts(f: Partial<typeof FAMILY>) {
  if (f.ui) FAMILY.ui = f.ui;
  if (f.mono) FAMILY.mono = f.mono;
  if (f.hand) FAMILY.hand = f.hand;
  // Cached card faces baked the old family in; drop them so the next frame
  // redraws with the real one.
  faceCache.clear();
}

export function fontStacks() {
  return { ...FAMILY };
}

const FONT = {
  ui: (px: number, w = 500) => `${w} ${px}px ${FAMILY.ui}`,
  mono: (px: number, w = 500) => `${w} ${px}px ${FAMILY.mono}`,
  hand: (px: number, w = 600) => `${w} ${px}px ${FAMILY.hand}`,
};

const frac = (x: number) => x - Math.floor(x);
const clamp = (x: number, a: number, b: number) => (x < a ? a : x > b ? b : x);
const clamp01 = (x: number) => clamp(x, 0, 1);

function smooth(e0: number, e1: number, x: number) {
  const t = clamp01((x - e0) / (e1 - e0));
  return t * t * (3 - 2 * t);
}

/** 0→1→0 envelope over q ∈ [0,1). Zero at both ends, so anything driven by
 *  frac(p + phase) is loop-seamless by construction. */
function pulse(q: number, inEnd = 0.18, outStart = 0.7, outEnd = 0.95) {
  return smooth(0, inEnd, q) * (1 - smooth(outStart, outEnd, q));
}

function mulberry32(a: number) {
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/* ================================================================
   LAYOUT — responsive, well-aware
   ================================================================ */

export type CardKind = "wire" | "code" | "er" | "note";
export type Well = { rx: number; ry: number };
export type Card = {
  x: number;
  y: number;
  w: number;
  h: number;
  kind: CardKind;
  ph: number;
  rot: number;
};
export type Layout = {
  W: number;
  H: number;
  portrait: boolean;
  well: Well;
  unit: number;
  cards: Card[];
};
export type Pointer = { x: number; y: number; on: boolean; strength: number };

/**
 * The empty ellipse the copy sits in.
 *
 * `hint` is the measured copy block, in device pixels, already expanded to a
 * radius about the canvas centre — the host component measures the real DOM
 * node and hands it over. That matters: the fallback below is a guess tuned
 * for a laptop, and on a phone the copy block is roughly twice as tall as its
 * 290px cap allows, so the stacked cards sat straight on top of the trust row.
 *
 * Capped as a fraction of the frame either way, so a very tall copy block
 * cannot eat the whole thing and leave the board nowhere to stand.
 */
export function well(W: number, H: number, hint?: Well | null): Well {
  if (hint) {
    return {
      rx: Math.min(hint.rx, W * 0.5),
      ry: Math.min(hint.ry, H * 0.46),
    };
  }
  return {
    rx: Math.min(W * 0.5, 430),
    ry: Math.min(H * 0.42, 290),
  };
}

/**
 * Anchors are normalised CENTRES, not angles. An earlier version pushed each
 * card radially out of the well by its own size, which on an ordinary laptop
 * demanded more room than the frame had — so every card hit the clamp and sat
 * jammed against an edge, reading as "cut off". Anchoring, then correcting in
 * both directions, keeps them comfortable at every size.
 *
 * Landscape puts the board in the four corners; portrait stacks it above and
 * below, because there is no room beside a phone.
 */
type Anchor = { u: number; v: number; kind: CardKind; ph: number; sz: number; rot: number };

const ANCHORS_LANDSCAPE: Anchor[] = [
  { u: 0.13, v: 0.24, kind: "wire", ph: 0.0, sz: 1.0, rot: -1.4 },
  { u: 0.87, v: 0.19, kind: "code", ph: 0.26, sz: 0.95, rot: 1.1 },
  { u: 0.87, v: 0.77, kind: "er", ph: 0.53, sz: 1.0, rot: -0.9 },
  { u: 0.13, v: 0.8, kind: "note", ph: 0.76, sz: 0.8, rot: 2.6 },
];
const ANCHORS_PORTRAIT: Anchor[] = [
  { u: 0.28, v: 0.1, kind: "code", ph: 0.0, sz: 0.95, rot: -1.3 },
  { u: 0.74, v: 0.14, kind: "wire", ph: 0.3, sz: 1.0, rot: 1.2 },
  { u: 0.74, v: 0.86, kind: "er", ph: 0.55, sz: 1.0, rot: -1.0 },
  { u: 0.28, v: 0.91, kind: "note", ph: 0.8, sz: 0.8, rot: 2.4 },
];

/**
 * How clear a card is of the copy's well: the nearest point of its box,
 * measured in ellipse units. >= 1 means the box does not touch the well.
 * The sandbox's shots.mjs asserts the same quantity, so the layout and the
 * test agree on what "clear" means rather than each having its own idea.
 */
export function clearance(dx: number, dy: number, cw: number, ch: number, w: Well) {
  const px = Math.max(0, Math.abs(dx) - cw / 2);
  const py = Math.max(0, Math.abs(dy) - ch / 2);
  return Math.hypot(px / w.rx, py / w.ry);
}

export function layout(W: number, H: number, hint?: Well | null): Layout {
  const s = Math.min(W, H);
  const portrait = W / H < 1.15;
  const anchors = portrait ? ANCHORS_PORTRAIT : ANCHORS_LANDSCAPE;
  const w = well(W, H, hint);

  // Bounded by BOTH axes, so a short window shrinks cards instead of
  // overflowing them. Portrait allows a much larger share of the width
  // because the board stacks vertically there.
  //
  // Every bound is a FRACTION OF THE FRAME, never an absolute pixel count.
  // W and H arrive in device pixels, so a fixed cap of 300 meant cards came
  // out half-size on any retina screen — the detail was all being drawn at
  // half the intended scale.
  const base = clamp(
    Math.min(W * (portrait ? 0.44 : 0.22), H * 0.32),
    s * 0.13,
    portrait ? W * 0.46 : s * 0.42
  );
  const gap = s * 0.045;
  // the extra covers the corner a rotated card swings out to
  const margin = s * 0.05 + base * 0.03;

  return {
    W,
    H,
    portrait,
    well: w,
    unit: s,
    cards: anchors.map((a) => {
      /* The three corrections fight each other: pushing a card out of the
         well can shove it off the frame, and clamping it back to the frame
         can shove it into the well. Ordering alone cannot settle that, so
         place, measure the actual clearance, and shrink until both hold.
         Deterministic — a fixed number of steps, no randomness. */
      let cw = base * a.sz;
      let cy = 0;
      let cx = 0;
      let ch = 0;

      for (let attempt = 0; attempt < 10; attempt++) {
        ch = cw * 0.66;
        const dirX = a.u < 0.5 ? -1 : 1;
        const dirY = a.v < 0.5 ? -1 : 1;

        // keep it from drifting to a lonely edge on a very wide screen
        const maxX = w.rx + cw * 0.5 + gap * 2.4;
        const maxY = w.ry + ch * 0.5 + gap * 2.4;
        let dx = clamp(W * a.u - W / 2, -maxX, maxX);
        let dy = clamp(H * a.v - H / 2, -maxY, maxY);

        // then push it clear of the copy's well, along its own quadrant
        const needX = w.rx + cw * 0.5 + gap * 0.5;
        const needY = w.ry + ch * 0.5 + gap * 0.5;
        if (clearance(dx, dy, cw, ch, w) < 1) {
          // move on whichever axis is cheaper for this anchor
          if (Math.abs(dx) / needX > Math.abs(dy) / needY) dx = dirX * needX;
          else dy = dirY * needY;
        }

        cx = clamp(W / 2 + dx, margin + cw / 2, W - margin - cw / 2);
        cy = clamp(H / 2 + dy, margin + ch / 2, H - margin - ch / 2);

        // did the frame clamp undo the push? then the card is simply too big
        if (clearance(cx - W / 2, cy - H / 2, cw, ch, w) >= 1) break;
        cw *= 0.9;
      }

      return {
        x: cx - cw / 2,
        y: cy - ch / 2,
        w: cw,
        h: ch,
        kind: a.kind,
        ph: a.ph,
        rot: (a.rot * Math.PI) / 180,
      };
    }),
  };
}

/* ================================================================
   DRAWING
   ================================================================ */

type Ctx = CanvasRenderingContext2D;
type Rect = { x: number; y: number; w: number; h: number };

function roundRect(ctx: Ctx, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

const BLOBS = [
  { ax: 0.32, ay: 0.26, ph: 0.0, r: 0.6, col: C.accent, a: 0.17, par: 1.0 },
  { ax: 0.28, ay: 0.34, ph: 0.37, r: 0.48, col: C.accentWarm, a: 0.14, par: -0.7 },
  { ax: 0.38, ay: 0.2, ph: 0.68, r: 0.7, col: C.accentDeep, a: 0.09, par: 0.45 },
];

function drawWash(ctx: Ctx, L: Layout, p: number, ptr: Pointer) {
  const { W, H } = L;
  const maxD = Math.max(W, H);
  for (const b of BLOBS) {
    const t = TAU * (p + b.ph);
    const x = W / 2 + Math.cos(t) * b.ax * W + ptr.x * b.par * W * 0.035;
    const y = H / 2 + Math.sin(t) * b.ay * H + ptr.y * b.par * H * 0.035;
    const R = b.r * maxD * 0.62;
    const a = b.a * (0.82 + 0.18 * Math.cos(TAU * (p * 2 + b.ph)));
    const g = ctx.createRadialGradient(x, y, 0, x, y, R);
    g.addColorStop(0, rgba(b.col, a));
    g.addColorStop(0.55, rgba(b.col, a * 0.35));
    g.addColorStop(1, rgba(b.col, 0));
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);
  }
}

/* ---- grid, as a cached pattern ----
   Stroking every dot was ~2000 arc() calls per frame, which is most of what
   pushed the live layer under its framerate budget on a large canvas. The
   dots are one tile, tiled by the compositor; the well fade is one cached
   mask; the drift is a translate. All the per-frame work is three full-canvas
   composites regardless of resolution. */
type GridCache = {
  key: string;
  sp: number;
  tile: HTMLCanvasElement;
  mask: HTMLCanvasElement;
  layer: HTMLCanvasElement;
  lc: Ctx;
};
let gridCache: GridCache | null = null;

function ensureGrid(W: number, H: number, w: Well): GridCache {
  const key = `${W}|${H}|${Math.round(w.rx)}|${Math.round(w.ry)}`;
  if (gridCache && gridCache.key === key) return gridCache;

  const sp = Math.max(W, H) * 0.0165;
  const n = Math.max(2, Math.round(sp));
  const tile = document.createElement("canvas");
  tile.width = tile.height = n;
  const tc = tile.getContext("2d")!;
  tc.fillStyle = rgba(C.grid, 1);
  tc.beginPath();
  tc.arc(n / 2, n / 2, Math.max(1, sp * 0.062), 0, TAU);
  tc.fill();

  // elliptical fade that follows the copy's well rather than a circle
  const mask = document.createElement("canvas");
  mask.width = W;
  mask.height = H;
  const mc = mask.getContext("2d")!;
  mc.translate(W / 2, H / 2);
  mc.scale(w.rx, w.ry);
  const g = mc.createRadialGradient(0, 0, 0.9, 0, 0, 1.7);
  g.addColorStop(0, "rgba(0,0,0,0)");
  g.addColorStop(1, "rgba(0,0,0,0.9)");
  mc.fillStyle = g;
  mc.fillRect(-W / 2 / w.rx, -H / 2 / w.ry, W / w.rx, H / w.ry);

  const layer = document.createElement("canvas");
  layer.width = W;
  layer.height = H;

  gridCache = { key, sp, tile, mask, layer, lc: layer.getContext("2d")! };
  return gridCache;
}

/** Dots, drifting, faded out of the centre well and lifted near the cursor. */
function drawGrid(ctx: Ctx, L: Layout, p: number, ptr: Pointer) {
  const { W, H, unit } = L;
  const gc = ensureGrid(W, H, L.well);
  const { sp, lc, layer, mask } = gc;
  const off = frac(p * 2) * sp;
  const pat = lc.createPattern(gc.tile, "repeat");

  lc.setTransform(1, 0, 0, 1, 0, 0);
  lc.clearRect(0, 0, W, H);
  lc.globalCompositeOperation = "source-over";
  lc.setTransform(1, 0, 0, 1, off, off);
  lc.fillStyle = pat!;
  lc.fillRect(-off, -off, W, H);
  lc.setTransform(1, 0, 0, 1, 0, 0);
  lc.globalCompositeOperation = "destination-in";
  lc.drawImage(mask, 0, 0);
  lc.globalCompositeOperation = "source-over";

  ctx.drawImage(layer, 0, 0);

  // dots wake as the cursor passes — the canvas responding to you
  if (ptr.on && ptr.strength > 0.02) {
    const px = W / 2 + ptr.x * W * 0.5;
    const py = H / 2 + ptr.y * H * 0.5;
    const r = unit * 0.34;
    lc.globalCompositeOperation = "destination-in";
    const lg = lc.createRadialGradient(px, py, 0, px, py, r);
    lg.addColorStop(0, `rgba(0,0,0,${0.55 * ptr.strength})`);
    lg.addColorStop(1, "rgba(0,0,0,0)");
    lc.fillStyle = lg;
    lc.fillRect(0, 0, W, H);
    lc.globalCompositeOperation = "source-over";
    ctx.drawImage(layer, 0, 0);
  }
}

/** How lit a point is by the cursor, 0..1. */
function proximity(L: Layout, ptr: Pointer, x: number, y: number) {
  if (!ptr.on) return 0;
  const px = L.W / 2 + ptr.x * L.W * 0.5;
  const py = L.H / 2 + ptr.y * L.H * 0.5;
  return smooth(L.unit * 0.42, L.unit * 0.06, Math.hypot(x - px, y - py)) * ptr.strength;
}

/** Text, centred vertically on `y`, clipped to `maxW` if given. */
function text(
  ctx: Ctx,
  str: string,
  x: number,
  y: number,
  font: string,
  col: RGB,
  a: number,
  maxW?: number
) {
  ctx.font = font;
  ctx.fillStyle = rgba(col, a);
  ctx.textBaseline = "middle";
  if (maxW) ctx.fillText(str, x, y, maxW);
  else ctx.fillText(str, x, y);
}

/* ---- the four surfaces, each one something the product actually makes ---- */

type Token = "kw" | "type" | "id" | "pun";
const SCHEMA: [string, Token][][] = [
  [
    ["model ", "kw"],
    ["Order", "type"],
    [" {", "pun"],
  ],
  [
    ["  id      ", "id"],
    ["uuid", "type"],
    [" @id", "kw"],
  ],
  [
    ["  total   ", "id"],
    ["int", "type"],
  ],
  [
    ["  user    ", "id"],
    ["User", "type"],
    [" @rel", "kw"],
  ],
  [["}", "pun"]],
];
const TOKEN: Record<Token, RGB> = {
  kw: C.accent,
  type: C.accentDeep,
  id: C.ink,
  pun: C.muted,
};

function drawWireframe(
  ctx: Ctx,
  x: number,
  y: number,
  w: number,
  h: number,
  hi: number,
  det: boolean
) {
  const u = h / 100;
  // browser chrome
  ctx.fillStyle = rgba(C.muted, 0.1);
  roundRect(ctx, x, y, w, u * 13, u * 3);
  ctx.fill();
  for (let i = 0; i < 3; i++) {
    ctx.fillStyle = rgba(C.muted, 0.3);
    ctx.beginPath();
    ctx.arc(x + u * 6 + i * u * 6, y + u * 6.5, u * 1.8, 0, TAU);
    ctx.fill();
  }
  // nav: mark + links
  const ny = y + u * 19;
  ctx.fillStyle = rgba(C.accent, 0.75);
  roundRect(ctx, x, ny - u * 3, u * 7, u * 6, u * 1.6);
  ctx.fill();
  for (let i = 0; i < 3; i++) {
    ctx.fillStyle = rgba(C.muted, 0.24);
    roundRect(ctx, x + w - u * (30 - i * 10), ny - u * 1.5, u * 7, u * 3, u * 1.5);
    ctx.fill();
  }
  // hero: headline, sub, a real CTA in the brand colour
  ctx.fillStyle = rgba(C.ink, 0.16);
  roundRect(ctx, x, y + u * 31, w * 0.66, u * 7, u * 2);
  ctx.fill();
  ctx.fillStyle = rgba(C.muted, 0.18);
  roundRect(ctx, x, y + u * 41, w * 0.46, u * 4, u * 2);
  ctx.fill();
  ctx.fillStyle = rgba(C.accent, 0.85 + hi * 0.15);
  roundRect(ctx, x, y + u * 50, w * 0.3, u * 9, u * 2.4);
  ctx.fill();
  if (det) {
    text(ctx, "Get started", x + w * 0.055, y + u * 54.6, FONT.ui(u * 4.6, 600), C.card, 0.95);
  }
  // two content cards below
  for (let i = 0; i < 2; i++) {
    const cw = (w - u * 5) / 2;
    ctx.fillStyle = rgba(C.muted, 0.09);
    ctx.strokeStyle = rgba(C.muted, 0.16);
    ctx.lineWidth = 1;
    roundRect(ctx, x + i * (cw + u * 5), y + u * 66, cw, h - u * 66, u * 2.4);
    ctx.fill();
    ctx.stroke();
  }
}

function drawSchema(ctx: Ctx, x: number, y: number, w: number, h: number, det: boolean) {
  const lh = h / 5.4;
  const fs = Math.min(lh * 0.72, h * 0.145);
  if (!det) {
    const ws = [0.62, 0.5, 0.4, 0.56, 0.2];
    for (let i = 0; i < 5; i++) {
      const ind = i === 0 || i === 4 ? 0 : w * 0.08;
      ctx.fillStyle = rgba(C.accent, 0.5);
      roundRect(ctx, x + ind, y + i * lh, w * 0.11, fs * 0.5, fs * 0.25);
      ctx.fill();
      ctx.fillStyle = rgba(C.muted, 0.24);
      roundRect(ctx, x + ind + w * 0.15, y + i * lh, w * (ws[i] - 0.15), fs * 0.5, fs * 0.25);
      ctx.fill();
    }
    return;
  }
  ctx.textBaseline = "middle";
  for (let i = 0; i < SCHEMA.length; i++) {
    let cx = x;
    const cy = y + i * lh + lh * 0.5;
    for (const [str, tok] of SCHEMA[i]) {
      ctx.font = FONT.mono(fs, tok === "kw" ? 600 : 500);
      ctx.fillStyle = rgba(TOKEN[tok], tok === "id" ? 0.62 : 0.85);
      ctx.fillText(str, cx, cy);
      cx += ctx.measureText(str).width;
    }
  }
}

function drawER(ctx: Ctx, x: number, y: number, w: number, h: number, det: boolean) {
  const ew = w * 0.44;
  const eh = h * 0.46;
  const ents = [
    { x: x, y: y, name: "users", rows: ["id", "email"] },
    { x: x + w - ew, y: y + h - eh, name: "orders", rows: ["id", "user_id"] },
  ];
  for (const e of ents) {
    ctx.fillStyle = rgba(C.card, 1);
    ctx.strokeStyle = rgba(C.accent, 0.45);
    ctx.lineWidth = Math.max(1, h * 0.012);
    roundRect(ctx, e.x, e.y, ew, eh, h * 0.05);
    ctx.fill();
    ctx.stroke();
    // header band, the way a real ER table renders
    ctx.save();
    roundRect(ctx, e.x, e.y, ew, eh, h * 0.05);
    ctx.clip();
    ctx.fillStyle = rgba(C.accent, 0.16);
    ctx.fillRect(e.x, e.y, ew, eh * 0.36);
    ctx.restore();
    if (det) {
      const fs = eh * 0.23;
      text(
        ctx,
        e.name,
        e.x + ew * 0.1,
        e.y + eh * 0.19,
        FONT.mono(fs, 600),
        C.accentDeep,
        0.95,
        ew * 0.8
      );
      for (let i = 0; i < e.rows.length; i++) {
        text(
          ctx,
          e.rows[i],
          e.x + ew * 0.1,
          e.y + eh * (0.52 + i * 0.26),
          FONT.mono(fs * 0.88),
          C.muted,
          0.8,
          ew * 0.8
        );
      }
    } else {
      for (let i = 0; i < 2; i++) {
        ctx.fillStyle = rgba(C.muted, 0.3);
        roundRect(ctx, e.x + ew * 0.1, e.y + eh * (0.5 + i * 0.24), ew * 0.6, eh * 0.1, eh * 0.05);
        ctx.fill();
      }
    }
  }
  // relation, with a crow's foot — the detail that makes it read as an ERD
  const a = { x: ents[0].x + ew, y: ents[0].y + eh * 0.66 };
  const b = { x: ents[1].x, y: ents[1].y + eh * 0.4 };
  ctx.strokeStyle = rgba(C.accent, 0.62);
  ctx.lineWidth = Math.max(1.1, h * 0.014);
  ctx.beginPath();
  ctx.moveTo(a.x, a.y);
  ctx.bezierCurveTo(a.x + w * 0.12, a.y, b.x - w * 0.12, b.y, b.x, b.y);
  ctx.stroke();
  const f = h * 0.07;
  ctx.beginPath();
  ctx.moveTo(b.x, b.y);
  ctx.lineTo(b.x - f, b.y - f);
  ctx.moveTo(b.x, b.y);
  ctx.lineTo(b.x - f, b.y + f);
  ctx.moveTo(b.x, b.y);
  ctx.lineTo(b.x - f * 1.5, b.y);
  ctx.stroke();
}

function drawNote(ctx: Ctx, x: number, y: number, w: number, h: number, det: boolean) {
  const fold = Math.min(w, h) * 0.22;
  ctx.fillStyle = rgba(C.note, 0.95);
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.lineTo(x + w, y);
  ctx.lineTo(x + w, y + h - fold);
  ctx.lineTo(x + w - fold, y + h);
  ctx.lineTo(x, y + h);
  ctx.closePath();
  ctx.fill();
  // the turned-up corner every sticky note has
  ctx.fillStyle = rgba(C.accentDeep, 0.16);
  ctx.beginPath();
  ctx.moveTo(x + w, y + h - fold);
  ctx.lineTo(x + w - fold, y + h);
  ctx.lineTo(x + w - fold, y + h - fold);
  ctx.closePath();
  ctx.fill();

  if (det) {
    const fs = h * 0.2;
    text(ctx, "what if checkout", x + w * 0.09, y + h * 0.28, FONT.hand(fs, 600), C.noteInk, 0.9);
    text(ctx, "was one step?", x + w * 0.09, y + h * 0.52, FONT.hand(fs, 600), C.noteInk, 0.9);
  } else {
    for (let i = 0; i < 2; i++) {
      ctx.fillStyle = rgba(C.noteInk, 0.4);
      roundRect(
        ctx,
        x + w * 0.09,
        y + h * (0.26 + i * 0.22),
        w * (0.74 - i * 0.18),
        h * 0.07,
        h * 0.035
      );
      ctx.fill();
    }
  }
}

/** Small circles where wires attach — React Flow handles, essentially. They
 *  only appear on a card you are near, the way real canvas ports do. */
function drawPorts(ctx: Ctx, r: Rect, s: number, lit: number) {
  if (lit < 0.05) return;
  const rr = s * 0.028;
  const pts = [
    [r.x + r.w / 2, r.y],
    [r.x + r.w / 2, r.y + r.h],
    [r.x, r.y + r.h / 2],
    [r.x + r.w, r.y + r.h / 2],
  ];
  for (const [px, py] of pts) {
    ctx.fillStyle = rgba(C.card, lit);
    ctx.strokeStyle = rgba(C.accent, lit * 0.9);
    ctx.lineWidth = Math.max(1, s * 0.008);
    ctx.beginPath();
    ctx.arc(px, py, rr, 0, TAU);
    ctx.fill();
    ctx.stroke();
  }
}

/* ---- card faces, drawn once per size ----
   A card's interior — border, title row, wireframe or schema or ERD or note —
   only changes when the card changes SIZE, which happens on resize. Redrawing
   all of it every frame was the other half of the framerate problem. The
   lit-dependent parts (shadow depth, selection ring, ports) stay live. */
type Face = { canvas: HTMLCanvasElement; m: number };
const faceCache = new Map<string, Face>();

function cardFace(kind: CardKind, w: number, h: number): Face {
  const key = `${kind}|${Math.round(w)}|${Math.round(h)}`;
  const hit = faceCache.get(key);
  if (hit) return hit;

  const m = Math.ceil(Math.min(w, h) * 0.02) + 2; // room for the border stroke
  const cv = document.createElement("canvas");
  cv.width = Math.ceil(w) + m * 2;
  cv.height = Math.ceil(h) + m * 2;
  drawFace(cv.getContext("2d")!, m, m, w, h, kind);

  const face = { canvas: cv, m };
  if (faceCache.size > 24) faceCache.clear(); // bounded; sizes are few
  faceCache.set(key, face);
  return face;
}

const CARD_TITLE: Record<CardKind, string> = {
  wire: "Checkout — v3",
  code: "schema.prisma",
  er: "orders.erd",
  note: "idea",
};

function drawFace(ctx: Ctx, x: number, y: number, w: number, h: number, kind: CardKind) {
  // Card chrome scales with the CARD, not the frame. Deriving radius and
  // shadow from L.unit meant a 300px card on a 1600px canvas got a 120px
  // shadow blur and a 35px corner — which read as bloated and edge-cut at
  // any real device pixel ratio.
  const s = Math.min(w, h);
  const pad = w * 0.07;
  const rad = s * 0.075;
  const det = w >= 150; // below this, text is mush — draw the simplified form
  const r = { x, y, w, h };

  // opaque: a translucent face let the wires show through it, which read as
  // a bug rather than as depth
  ctx.fillStyle = rgba(C.card, 1);
  roundRect(ctx, r.x, r.y, r.w, r.h, rad);
  ctx.fill();

  ctx.strokeStyle = rgba(C.muted, 0.32);
  ctx.lineWidth = Math.max(1.25, s * 0.006);
  roundRect(ctx, r.x, r.y, r.w, r.h, rad);
  ctx.stroke();

  /* ---- title row: type chip, name, collaborator dots ---- */
  const th = r.h * 0.17;
  const cy = r.y + pad * 0.7 + th * 0.5;
  const chip = th * 0.62;
  ctx.fillStyle = rgba(C.accent, 0.16);
  roundRect(ctx, r.x + pad, cy - chip / 2, chip, chip, chip * 0.3);
  ctx.fill();
  ctx.strokeStyle = rgba(C.accent, 0.75);
  ctx.lineWidth = Math.max(1, s * 0.0022);
  const ci = chip * 0.26;
  ctx.beginPath();
  if (kind === "wire") {
    ctx.rect(r.x + pad + ci, cy - chip / 2 + ci, chip - ci * 2, chip - ci * 2);
  } else if (kind === "code") {
    ctx.moveTo(r.x + pad + chip * 0.38, cy - ci);
    ctx.lineTo(r.x + pad + ci, cy);
    ctx.lineTo(r.x + pad + chip * 0.38, cy + ci);
    ctx.moveTo(r.x + pad + chip - chip * 0.38, cy - ci);
    ctx.lineTo(r.x + pad + chip - ci, cy);
    ctx.lineTo(r.x + pad + chip - chip * 0.38, cy + ci);
  } else if (kind === "er") {
    ctx.arc(r.x + pad + chip * 0.36, cy, ci * 0.8, 0, TAU);
    ctx.moveTo(r.x + pad + chip - ci * 0.2, cy);
    ctx.arc(r.x + pad + chip - chip * 0.36, cy, ci * 0.8, 0, TAU);
  } else {
    ctx.moveTo(r.x + pad + ci, cy - ci * 0.6);
    ctx.lineTo(r.x + pad + chip - ci, cy - ci * 0.6);
    ctx.moveTo(r.x + pad + ci, cy + ci * 0.4);
    ctx.lineTo(r.x + pad + chip - ci * 1.8, cy + ci * 0.4);
  }
  ctx.stroke();

  const title = CARD_TITLE[kind];
  if (det) {
    text(ctx, title, r.x + pad + chip * 1.5, cy, FONT.ui(th * 0.5, 600), C.ink, 0.72, r.w * 0.5);
  } else {
    ctx.fillStyle = rgba(C.muted, 0.34);
    roundRect(ctx, r.x + pad + chip * 1.4, cy - th * 0.14, r.w * 0.32, th * 0.28, th * 0.14);
    ctx.fill();
  }
  // who else is in here — the whole "create together" promise in three dots
  const peers = [C.peerA, C.peerB, C.peerC];
  for (let i = 0; i < (det ? 3 : 2); i++) {
    const px = r.x + r.w - pad - i * chip * 0.42;
    ctx.fillStyle = rgba(peers[i], 0.9);
    ctx.strokeStyle = rgba(C.card, 1);
    ctx.lineWidth = Math.max(1, s * 0.0022);
    ctx.beginPath();
    ctx.arc(px, cy, chip * 0.27, 0, TAU);
    ctx.fill();
    ctx.stroke();
  }

  /* ---- hairline under the title, then the surface itself ---- */
  const top = r.y + pad * 0.7 + th + pad * 0.45;
  ctx.strokeStyle = rgba(C.muted, 0.14);
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(r.x + pad, top - pad * 0.28);
  ctx.lineTo(r.x + r.w - pad, top - pad * 0.28);
  ctx.stroke();

  const iw = r.w - pad * 2;
  const ih = r.h - (top - r.y) - pad * 0.9;
  ctx.save();
  roundRect(ctx, r.x + pad, top, iw, ih, rad * 0.4);
  ctx.clip();
  if (kind === "wire") drawWireframe(ctx, r.x + pad, top, iw, ih, 0, det);
  else if (kind === "code") drawSchema(ctx, r.x + pad, top, iw, ih, det);
  else if (kind === "er") drawER(ctx, r.x + pad, top, iw, ih, det);
  else drawNote(ctx, r.x + pad, top, iw, ih, det);
  ctx.restore();
}

type LiveCard = Rect & { kind: CardKind; ph: number; rot: number };

function drawCard(ctx: Ctx, r: LiveCard, kind: CardKind, a: number, lit: number) {
  const s = Math.min(r.w, r.h);
  const rad = s * 0.075;
  const face = cardFace(kind, r.w, r.h);

  ctx.save();
  ctx.globalAlpha = a;
  // canvas objects are never perfectly square to the world
  ctx.translate(r.x + r.w / 2, r.y + r.h / 2);
  ctx.rotate(r.rot);
  ctx.translate(-(r.x + r.w / 2), -(r.y + r.h / 2));

  // two shadows cast from an invisible plate: a soft ambient one and a tight
  // contact one. That pairing is what separates a real surface from a
  // rectangle, and it is the only part of the card that has to stay live,
  // because it deepens as the cursor approaches.
  ctx.fillStyle = rgba(C.card, 1);
  ctx.shadowColor = rgba(C.ink, 0.11 + lit * 0.07);
  ctx.shadowBlur = s * 0.16 * (1 + lit * 0.7);
  ctx.shadowOffsetY = s * 0.05 * (1 + lit * 0.5);
  roundRect(ctx, r.x, r.y, r.w, r.h, rad);
  ctx.fill();
  ctx.shadowColor = rgba(C.ink, 0.13);
  ctx.shadowBlur = s * 0.03;
  ctx.shadowOffsetY = s * 0.008;
  ctx.fill();
  ctx.shadowColor = "transparent";
  ctx.shadowBlur = 0;
  ctx.shadowOffsetY = 0;

  ctx.drawImage(face.canvas, r.x - face.m, r.y - face.m);

  /* ---- selected state, as the cursor comes near ---- */
  if (lit > 0.05) {
    const o = s * 0.035;
    ctx.strokeStyle = rgba(C.accent, lit * 0.55);
    ctx.lineWidth = Math.max(1.4, s * 0.008);
    roundRect(ctx, r.x - o, r.y - o, r.w + o * 2, r.h + o * 2, rad * 1.25);
    ctx.stroke();
    drawPorts(ctx, r, s, lit);
  }

  ctx.restore();
  ctx.globalAlpha = 1;
}

type Pt = [number, number];

function bez(p0: Pt, c: Pt, p1: Pt, t: number): Pt {
  const m = 1 - t;
  const a = m * m,
    b = 2 * m * t,
    d = t * t;
  return [a * p0[0] + b * c[0] + d * p1[0], a * p0[1] + b * c[1] + d * p1[1]];
}

/** The point on `a`'s edge that faces `b` — whichever of the four ports the
 *  dominant axis picks, matching where drawPorts renders the handles. */
function port(a: Rect, b: Rect): Pt {
  const ax = a.x + a.w / 2;
  const ay = a.y + a.h / 2;
  const dx = b.x + b.w / 2 - ax;
  const dy = b.y + b.h / 2 - ay;
  if (Math.abs(dx) * a.h > Math.abs(dy) * a.w) {
    return [dx > 0 ? a.x + a.w : a.x, ay];
  }
  return [ax, dy > 0 ? a.y + a.h : a.y];
}

/**
 * Where each wire runs: from the port on one card that faces the next, bowed
 * clear of the copy's well.
 *
 * Exported so the tests can assert the routing rather than a screenshot
 * having to catch a stroke lying across the trust row — the drawing below and
 * the test read the same curves.
 */
export function wireRoutes(
  L: Layout,
  rects: readonly Rect[] = L.cards
): { p0: Pt; c: Pt; p1: Pt }[] {
  const n = rects.length;
  const out: { p0: Pt; c: Pt; p1: Pt }[] = [];
  for (let i = 0; i < n; i++) {
    // Leave from the port that faces the other card, rather than from the
    // centre — a wire that emerges from an edge reads as connected, one that
    // starts under the card face reads as a stroke lying across it.
    const p0 = port(rects[i], rects[(i + 1) % n]);
    const p1 = port(rects[(i + 1) % n], rects[i]);
    // Bow proportional to the span being crossed, not to the frame. A flat
    // unit*0.3 pushed every control point so far out that the four wires read
    // as one giant orbit rather than as connections between cards.
    const span = Math.hypot(p1[0] - p0[0], p1[1] - p0[1]);
    const push = Math.min(L.unit * 0.14, span * 0.22);
    out.push({ p0, c: bowControl(L, p0, p1, push, 1.12), p1 });
  }
  return out;
}

/** Wires route AROUND the well rather than across it, so no stroke ever
 *  crosses the headline. */
function drawWires(ctx: Ctx, L: Layout, p: number, ptr: Pointer, rects: LiveCard[]) {
  const n = rects.length;
  const routes = wireRoutes(L, rects);
  for (let i = 0; i < n; i++) {
    const ph = (i / n) * 0.8 + 0.1;
    const q = frac(p + ph);
    // wires stay connected and breathe, rather than vanishing — the cards
    // they join are permanent, so a disappearing wire reads as a glitch
    const a = 0.42 + 0.58 * pulse(q, 0.22, 0.66, 0.96);

    const { p0, c, p1 } = routes[i];
    const mx = (p0[0] + p1[0]) / 2;
    const my = (p0[1] + p1[1]) / 2;

    const lit = proximity(L, ptr, mx, my);
    const grow = 1;
    const SEG = 48;
    ctx.strokeStyle = rgba(C.accent, a * (0.62 + lit * 0.35));
    ctx.lineWidth = Math.max(1.4, L.unit * 0.0034) * (1 + lit * 0.5);
    ctx.lineCap = "round";
    ctx.beginPath();
    for (let k = 0; k <= SEG; k++) {
      const [x, y] = bez(p0, c, p1, (k / SEG) * grow);
      if (k === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();

    {
      // a packet moving down the wire: a solid core with a small halo. It
      // used to be halo only, at triple this radius, which read as a smudge
      // on the paper rather than as something travelling
      const tt = frac(p * 2 + ph);
      const [gx, gy] = bez(p0, c, p1, tt);
      const core = Math.max(1.6, L.unit * 0.0038);
      const rr = core * 4.5;
      const g = ctx.createRadialGradient(gx, gy, 0, gx, gy, rr);
      g.addColorStop(0, rgba(C.accent, a * 0.42));
      g.addColorStop(1, rgba(C.accent, 0));
      ctx.fillStyle = g;
      ctx.fillRect(gx - rr, gy - rr, rr * 2, rr * 2);
      ctx.fillStyle = rgba(C.accent, a);
      ctx.beginPath();
      ctx.arc(gx, gy, core, 0, TAU);
      ctx.fill();
    }
  }
}

/* ================= collaborators =================
   Two other people, working the whole board. Nothing else in the scene says
   "together" as directly as somebody else's cursor crossing your canvas.

   Each peer walks a CLOSED tour of the cards, so the motion is periodic and
   loops with everything else. Within a leg they travel with an ease in and
   out, then dwell on the card — arrive, select it, work, move on. It should
   read as someone doing something, not as a dot on a circle. */
/**
 * The two tours are chosen so the peers can NEVER be on the same card.
 * Abhi's tour is the identity, so at segment i he is on card i. Arjun runs at
 * phase +0.5, which puts him on segment (i+2)%4, and his tour maps that to
 * card (i+3)%4 — never equal to i for a four-card board. The earlier pairing
 * (+0.47 with a rotate-by-2 tour) put them on the same card for three of the
 * four segments, where the second cursor drawn simply painted over the first.
 */
const PEERS = [
  { name: "Abhi", col: C.peerB, tour: [0, 1, 2, 3], ph: 0.0, dwell: 0.42 },
  { name: "Arjun", col: C.peerC, tour: [1, 2, 3, 0], ph: 0.5, dwell: 0.36 },
];

/**
 * Control point that bows a curve away from the copy, so neither a wire nor a
 * travelling cursor crosses the headline.
 *
 * `basePush` is the look — how much bow the curve wants for its own sake. It
 * is not enough on its own: both ends of a leg can sit clear of the well while
 * the middle sags straight back through it, which is exactly what put a stroke
 * across the trust row on a short window. So the push is also solved: a
 * quadratic's apex sits half way along the control push, so find the push that
 * lands the apex `minUnits` ellipse-radii out, and take whichever is larger.
 *
 * Falls back to the perpendicular when the leg's midpoint sits on the centre
 * and there is no outward direction to bow along.
 */
function bowControl(L: Layout, p0: Pt, p1: Pt, basePush: number, minUnits: number): Pt {
  const cx = L.W / 2;
  const cy = L.H / 2;
  const { rx, ry } = L.well;
  const mx = (p0[0] + p1[0]) / 2;
  const my = (p0[1] + p1[1]) / 2;

  let dx = mx - cx;
  let dy = my - cy;
  let dl = Math.hypot(dx, dy);
  if (dl < basePush * 0.5) {
    const tx = p1[0] - p0[0];
    const ty = p1[1] - p0[1];
    const tl = Math.hypot(tx, ty) || 1;
    dx = -ty / tl;
    dy = tx / tl;
    dl = 1;
  }
  const ux = dx / dl;
  const uy = dy / dl;

  let push = basePush;
  // |A + sB| = minUnits, in ellipse units, with s = push / 2
  const ax = (mx - cx) / rx;
  const ay = (my - cy) / ry;
  const bx = ux / rx;
  const by = uy / ry;
  const qa = bx * bx + by * by;
  const qc = ax * ax + ay * ay - minUnits * minUnits;
  if (qc < 0 && qa > 0) {
    const qb = 2 * (ax * bx + ay * by);
    const disc = qb * qb - 4 * qa * qc;
    if (disc > 0) push = Math.max(push, ((-qb + Math.sqrt(disc)) / (2 * qa)) * 2);
  }

  // ...but never bow so hard that the apex leaves the frame. A stroke that
  // walks off the edge reads as a bug; one that grazes the copy only reads as
  // untidy, so the frame wins the tie.
  const margin = L.unit * 0.02;
  let maxPush = Infinity;
  if (ux > 1e-6) maxPush = Math.min(maxPush, (L.W - margin - mx) / (ux * 0.5));
  else if (ux < -1e-6) maxPush = Math.min(maxPush, (margin - mx) / (ux * 0.5));
  if (uy > 1e-6) maxPush = Math.min(maxPush, (L.H - margin - my) / (uy * 0.5));
  else if (uy < -1e-6) maxPush = Math.min(maxPush, (margin - my) / (uy * 0.5));
  push = Math.max(basePush, Math.min(push, maxPush));

  // The solve above pins the apex, but with asymmetric endpoints the curve's
  // nearest approach sits a little to one side of it and can still dip inside.
  // So measure the whole curve and open the bow until it clears — bounded, so
  // this always terminates and stays deterministic.
  for (let i = 0; i < 6; i++) {
    const c: Pt = [mx + ux * push, my + uy * push];
    if (minWellUnits(L, p0, c, p1) >= 1.02) break;
    const next = Math.min(push * 1.28, maxPush);
    if (next <= push) break;
    push = next;
  }

  return [mx + ux * push, my + uy * push];
}

/** The curve's nearest approach to the copy, in ellipse units. */
function minWellUnits(L: Layout, p0: Pt, c: Pt, p1: Pt) {
  const { rx, ry } = L.well;
  const cx = L.W / 2;
  const cy = L.H / 2;
  let min = Infinity;
  const SAMPLES = 24;
  for (let k = 0; k <= SAMPLES; k++) {
    const [x, y] = bez(p0, c, p1, k / SAMPLES);
    const u = Math.hypot((x - cx) / rx, (y - cy) / ry);
    if (u < min) min = u;
  }
  return min;
}

type PeerState = {
  x: number;
  y: number;
  moving: boolean;
  dwellT: number;
  target: LiveCard | null;
};

/** Where a peer is, and what they are doing, at phase p. */
function peerState(
  L: Layout,
  rects: LiveCard[],
  peer: (typeof PEERS)[number],
  p: number
): PeerState | null {
  const n = peer.tour.length;
  const q = frac(p + peer.ph);
  const seg = q * n;
  const i = Math.floor(seg) % n;
  const f = seg - Math.floor(seg);

  const from = rects[peer.tour[i]];
  const to = rects[peer.tour[(i + 1) % n]];
  if (!from || !to) return null;

  // aim a little inside the card, so the arrow lands on content
  const aim = (r: Rect): Pt => [r.x + r.w * 0.34, r.y + r.h * 0.46];
  const p0 = aim(from);
  const p1 = aim(to);

  const travel = 1 - peer.dwell;
  if (f < travel) {
    const t = smooth(0, 1, f / travel); // ease out of one card and into the next
    const c = bowControl(L, p0, p1, L.unit * 0.26, 1.06);
    const [x, y] = bez(p0, c, p1, t);
    return { x, y, moving: true, dwellT: 0, target: null };
  }
  const d = (f - travel) / peer.dwell;
  return { x: p1[0], y: p1[1], moving: false, dwellT: d, target: to };
}

function drawPeers(ctx: Ctx, L: Layout, p: number, rects: LiveCard[]) {
  const s = L.unit;
  for (const peer of PEERS) {
    const st = peerState(L, rects, peer, p);
    if (!st) continue;
    const { x, y } = st;
    const k = s * 0.026; // cursor size

    ctx.save();

    /* ---- what they are working on: a remote selection, in their colour ---- */
    if (st.target && st.dwellT > 0.04) {
      const r = st.target;
      const fade = smooth(0.04, 0.16, st.dwellT) * (1 - smooth(0.8, 1, st.dwellT));
      const o = Math.min(r.w, r.h) * 0.045;
      ctx.strokeStyle = rgba(peer.col, fade * 0.85);
      ctx.lineWidth = Math.max(1.4, Math.min(r.w, r.h) * 0.012);
      roundRect(ctx, r.x - o, r.y - o, r.w + o * 2, r.h + o * 2, Math.min(r.w, r.h) * 0.09);
      ctx.stroke();
    }

    /* ---- the click, on arrival ---- */
    if (!st.moving && st.dwellT < 0.3) {
      const g = st.dwellT / 0.3;
      ctx.strokeStyle = rgba(peer.col, (1 - g) * 0.6);
      ctx.lineWidth = Math.max(1.2, s * 0.003);
      ctx.beginPath();
      ctx.arc(x, y, k * (0.4 + g * 1.9), 0, TAU);
      ctx.stroke();
    }

    /* ---- the arrow ---- */
    ctx.shadowColor = rgba(C.ink, 0.2);
    ctx.shadowBlur = s * 0.014;
    ctx.shadowOffsetY = s * 0.004;
    ctx.fillStyle = rgba(peer.col, 1);
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x, y + k * 1.35);
    ctx.lineTo(x + k * 0.33, y + k * 1.0);
    ctx.lineTo(x + k * 0.56, y + k * 1.5);
    ctx.lineTo(x + k * 0.76, y + k * 1.4);
    ctx.lineTo(x + k * 0.53, y + k * 0.92);
    ctx.lineTo(x + k * 0.95, y + k * 0.86);
    ctx.closePath();
    ctx.fill();
    ctx.shadowColor = "transparent";
    ctx.shadowBlur = 0;
    ctx.shadowOffsetY = 0;

    /* ---- the name pill ---- */
    const fs = Math.max(s * 0.017, 10);
    ctx.font = FONT.ui(fs, 600);
    const tw = ctx.measureText(peer.name).width;
    const pw = tw + fs * 1.3;
    const ph2 = fs * 1.75;
    ctx.fillStyle = rgba(peer.col, 1);
    roundRect(ctx, x + k * 0.85, y + k * 1.25, pw, ph2, ph2 * 0.42);
    ctx.fill();
    text(
      ctx,
      peer.name,
      x + k * 0.85 + fs * 0.65,
      y + k * 1.25 + ph2 * 0.5,
      FONT.ui(fs, 600),
      C.card,
      1
    );

    ctx.restore();
  }
  ctx.globalAlpha = 1;
}

function drawVignette(ctx: Ctx, L: Layout) {
  const { W, H } = L;
  const g = ctx.createRadialGradient(
    W / 2,
    H / 2,
    Math.min(W, H) * 0.32,
    W / 2,
    H / 2,
    Math.max(W, H) * 0.74
  );
  g.addColorStop(0, rgba(C.accentDeep, 0));
  g.addColorStop(1, rgba(C.accentDeep, 0.085));
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);
}

let grainTile: HTMLCanvasElement | null = null;

function drawGrain(ctx: Ctx, L: Layout) {
  if (!grainTile) {
    grainTile = document.createElement("canvas");
    grainTile.width = grainTile.height = 220;
    const gc = grainTile.getContext("2d")!;
    const img = gc.createImageData(220, 220);
    const rnd = mulberry32(0xa11ce);
    for (let i = 0; i < img.data.length; i += 4) {
      const v = 128 + (rnd() - 0.5) * 80;
      img.data[i] = img.data[i + 1] = img.data[i + 2] = v;
      img.data[i + 3] = 255;
    }
    gc.putImageData(img, 0, 0);
  }
  ctx.save();
  // light: grain is texture, not haze. Anything heavier reads as fog.
  ctx.globalAlpha = 0.022;
  ctx.globalCompositeOperation = "overlay";
  ctx.fillStyle = ctx.createPattern(grainTile, "repeat")!;
  ctx.fillRect(0, 0, L.W, L.H);
  ctx.restore();
}

/**
 * @param p    loop phase, 0..1
 * @param ptr  {x,y} in -1..1, {on} whether a pointer is present,
 *             {strength} 0..1 fade so it eases in and out
 * @param hint the measured copy block, in device pixels — see `well()`
 */
export function draw(
  ctx: Ctx,
  W: number,
  H: number,
  p: number,
  ptr?: Pointer,
  hint?: Well | null
): Layout {
  const pointer: Pointer = ptr ?? { x: 0, y: 0, on: false, strength: 0 };
  const L = layout(W, H, hint);

  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.fillStyle = rgba(C.bg, 1);
  ctx.fillRect(0, 0, W, H);

  drawWash(ctx, L, p, pointer);
  drawGrid(ctx, L, p, pointer);

  // parallax: cards ride the pointer a little more than the wash does
  const rects: LiveCard[] = L.cards.map((c) => {
    const bob = Math.sin(TAU * (p + c.ph)) * L.unit * 0.014;
    const depth = 0.02;
    return {
      x: c.x + pointer.x * L.W * depth,
      y: c.y + bob + pointer.y * L.H * depth,
      w: c.w,
      h: c.h,
      kind: c.kind,
      ph: c.ph,
      rot: c.rot,
    };
  });

  drawWires(ctx, L, p, pointer, rects);
  // The board is persistent now. It used to pulse each card in and out, which
  // stops making sense once a collaborator can arrive and select one — you
  // cannot select a card that is busy fading out.
  for (const r of rects) {
    drawCard(ctx, r, r.kind, 1, proximity(L, pointer, r.x + r.w / 2, r.y + r.h / 2));
  }
  drawPeers(ctx, L, p, rects);

  drawVignette(ctx, L);
  drawGrain(ctx, L);
  return L;
}
