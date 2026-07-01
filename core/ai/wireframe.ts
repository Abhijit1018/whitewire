export const WIREFRAME_TYPES = [
  "nav",
  "header",
  "text",
  "button",
  "input",
  "image",
  "card",
  "list",
] as const;

export type WireframeElement = {
  type: string;
  label: string;
  x: number;
  y: number;
  w: number;
  h: number;
};
export type WireframeSpec = { title: string; elements: WireframeElement[] };

export function buildWireframePrompt(description: string): string {
  return [
    "You are a UI designer producing a low-fidelity wireframe for a screen.",
    "Lay out UI elements on a 100x100 grid: x,y = top-left position (%), w,h = size (%).",
    `Element types: ${WIREFRAME_TYPES.join(", ")}.`,
    "Reply with ONLY JSON of this shape:",
    `{"title":"Screen name","elements":[{"type":"button","label":"Sign in","x":10,"y":80,"w":30,"h":8}]}`,
    "Use 5-12 elements. Keep them inside the grid and non-overlapping where possible.",
    "",
    `Screen: ${description}`,
  ].join("\n");
}

function clamp(n: unknown, min: number, max: number, fallback: number): number {
  const v = Number(n);
  if (!Number.isFinite(v)) return fallback;
  return Math.min(max, Math.max(min, v));
}

export function parseWireframe(raw: string): WireframeSpec {
  const empty: WireframeSpec = { title: "", elements: [] };
  const match = raw.match(/\{[\s\S]*\}/);
  if (!match) return empty;
  let obj: Record<string, unknown>;
  try {
    obj = JSON.parse(match[0]);
  } catch {
    return empty;
  }
  const rawEls = Array.isArray(obj.elements) ? obj.elements : [];
  const elements: WireframeElement[] = rawEls
    .map((e) => {
      const o = e as Record<string, unknown>;
      const type = String(o?.type ?? "text").trim().toLowerCase();
      return {
        type: (WIREFRAME_TYPES as readonly string[]).includes(type) ? type : "text",
        label: String(o?.label ?? "").trim(),
        x: clamp(o?.x, 0, 100, 0),
        y: clamp(o?.y, 0, 100, 0),
        w: clamp(o?.w, 1, 100, 20),
        h: clamp(o?.h, 1, 100, 8),
      };
    })
    .filter((e) => e.w > 0 && e.h > 0);
  return { title: String(obj.title ?? "").trim(), elements };
}
