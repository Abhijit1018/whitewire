export const WIREFRAME_TYPES = [
  // structure
  "nav",
  "sidebar",
  "header",
  "footer",
  "modal",
  "divider",
  // content
  "text",
  "image",
  "card",
  "list",
  "table",
  "chart",
  // controls
  "button",
  "input",
  "search",
  "tabs",
  "checkbox",
  "toggle",
  "pagination",
  "breadcrumb",
  // people & marks
  "avatar",
  "avatarRow",
  "badge",
  "icon",
] as const;

export type WireframeType = (typeof WIREFRAME_TYPES)[number];

export const WIREFRAME_DEVICES = ["desktop", "tablet", "mobile"] as const;
export type WireframeDevice = (typeof WIREFRAME_DEVICES)[number];

/** Width:height the frame is drawn at when a device is named. */
export const DEVICE_ASPECT: Record<WireframeDevice, number> = {
  desktop: 16 / 10,
  tablet: 3 / 4,
  mobile: 1 / 2,
};

export type WireframeElement = {
  type: string;
  label: string;
  x: number;
  y: number;
  w: number;
  h: number;
};

export type WireframeSpec = {
  title: string;
  elements: WireframeElement[];
  device?: WireframeDevice;
};

const VOCABULARY = [
  "Structure: nav (top bar), sidebar, header, footer, modal, divider",
  "Content: text, image, card, list, table, chart",
  "Controls: button, input, search, tabs, checkbox, toggle, pagination, breadcrumb",
  "People and marks: avatar, avatarRow, badge, icon",
].join("\n- ");

export function buildWireframePrompt(description: string): string {
  return [
    "You are a UI designer producing a low-fidelity wireframe for a screen.",
    "Lay out UI elements on a 100x100 grid: x,y = top-left position (%), w,h = size (%).",
    "",
    "Element types:",
    `- ${VOCABULARY}`,
    "",
    'Pick "desktop", "tablet" or "mobile" for device — it sets the frame shape.',
    "Desktop screens usually have a nav across the top and often a sidebar down",
    "the left. Mobile screens stack full-width and put navigation at the bottom.",
    "",
    "Reply with ONLY JSON of this shape:",
    `{"title":"Screen name","device":"desktop","elements":[{"type":"button","label":"Sign in","x":10,"y":80,"w":30,"h":8}]}`,
    "Use 8-18 elements — enough that the screen reads as a real layout.",
    "Keep them inside the grid and non-overlapping, except a modal which may sit on top.",
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
      const type = String(o?.type ?? "text").trim();
      // Match case-insensitively so "avatarrow" still lands on avatarRow.
      const known = (WIREFRAME_TYPES as readonly string[]).find(
        (t) => t.toLowerCase() === type.toLowerCase(),
      );
      return {
        type: known ?? "text",
        label: String(o?.label ?? "").trim(),
        x: clamp(o?.x, 0, 100, 0),
        y: clamp(o?.y, 0, 100, 0),
        w: clamp(o?.w, 1, 100, 20),
        h: clamp(o?.h, 1, 100, 8),
      };
    })
    .filter((e) => e.w > 0 && e.h > 0);

  const device = String(obj.device ?? "").trim().toLowerCase();
  return {
    title: String(obj.title ?? "").trim(),
    elements,
    device: (WIREFRAME_DEVICES as readonly string[]).includes(device)
      ? (device as WireframeDevice)
      : undefined,
  };
}
