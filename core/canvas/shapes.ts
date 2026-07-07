export type ShapeId =
  | "rectangle" | "roundRect" | "ellipse" | "diamond" | "triangle"
  | "line" | "arrow" | "cylinder" | "parallelogram" | "hexagon" | "cloud"
  | "star" | "heart" | "speechBubble" | "arrowBlock";

export type ShapeCategory = "basic" | "flowchart" | "decorative";
export type ShapeMeta = { id: ShapeId; label: string; category: ShapeCategory };

export const SHAPES: ShapeMeta[] = [
  { id: "rectangle", label: "Rectangle", category: "basic" },
  { id: "roundRect", label: "Rounded rectangle", category: "basic" },
  { id: "ellipse", label: "Ellipse", category: "basic" },
  { id: "diamond", label: "Diamond", category: "basic" },
  { id: "triangle", label: "Triangle", category: "basic" },
  { id: "line", label: "Line", category: "basic" },
  { id: "arrow", label: "Arrow", category: "basic" },
  { id: "cylinder", label: "Cylinder", category: "flowchart" },
  { id: "parallelogram", label: "Parallelogram", category: "flowchart" },
  { id: "hexagon", label: "Hexagon", category: "flowchart" },
  { id: "cloud", label: "Cloud", category: "flowchart" },
  { id: "star", label: "Star", category: "decorative" },
  { id: "heart", label: "Heart", category: "decorative" },
  { id: "speechBubble", label: "Speech bubble", category: "decorative" },
  { id: "arrowBlock", label: "Block arrow", category: "decorative" },
];

const PAD = 4;

type Pt = [number, number];
export type Primitive =
  | { kind: "rect"; round: boolean }
  | { kind: "ellipse" }
  | { kind: "polygon"; points: Pt[] }
  | { kind: "line"; points: Pt[]; arrow: boolean }
  | { kind: "path"; d: string };

function star(cx: number, cy: number, outer: number, inner: number, spikes = 5): Pt[] {
  const pts: Pt[] = [];
  const step = Math.PI / spikes;
  for (let i = 0; i < spikes * 2; i++) {
    const r = i % 2 === 0 ? outer : inner;
    const a = -Math.PI / 2 + i * step;
    pts.push([+(cx + r * Math.cos(a)).toFixed(2), +(cy + r * Math.sin(a)).toFixed(2)]);
  }
  return pts;
}

export function shapePrimitive(id: ShapeId, w: number, h: number, edges: "sharp" | "round"): Primitive {
  const l = PAD, t = PAD, r = w - PAD, b = h - PAD;
  const cx = w / 2, cy = h / 2, iw = r - l, ih = b - t;
  switch (id) {
    case "rectangle": return { kind: "rect", round: edges === "round" };
    case "roundRect": return { kind: "rect", round: true };
    case "ellipse": return { kind: "ellipse" };
    case "diamond": return { kind: "polygon", points: [[cx, t], [r, cy], [cx, b], [l, cy]] };
    case "triangle": return { kind: "polygon", points: [[cx, t], [r, b], [l, b]] };
    case "parallelogram": return { kind: "polygon", points: [[l + iw * 0.25, t], [r, t], [r - iw * 0.25, b], [l, b]] };
    case "hexagon": return { kind: "polygon", points: [[l + iw * 0.25, t], [r - iw * 0.25, t], [r, cy], [r - iw * 0.25, b], [l + iw * 0.25, b], [l, cy]] };
    case "arrowBlock": {
      const my = cy, sh = ih * 0.28, hw = iw * 0.4;
      return { kind: "polygon", points: [[l, my - sh], [l + hw, my - sh], [l + hw, t], [r, my], [l + hw, b], [l + hw, my + sh], [l, my + sh]] };
    }
    case "star": return { kind: "polygon", points: star(cx, cy, Math.min(iw, ih) / 2, Math.min(iw, ih) / 4) };
    case "line": return { kind: "line", points: [[l, cy], [r, cy]], arrow: false };
    case "arrow": return { kind: "line", points: [[l, cy], [r, cy]], arrow: true };
    case "cylinder": {
      const ry = ih * 0.12;
      const d = `M ${l} ${t + ry} A ${iw / 2} ${ry} 0 0 0 ${r} ${t + ry} L ${r} ${b - ry} A ${iw / 2} ${ry} 0 0 1 ${l} ${b - ry} Z M ${l} ${t + ry} A ${iw / 2} ${ry} 0 0 1 ${r} ${t + ry}`;
      return { kind: "path", d };
    }
    case "speechBubble": {
      const rad = 12, tailX = l + iw * 0.25;
      const d = `M ${l + rad} ${t} L ${r - rad} ${t} Q ${r} ${t} ${r} ${t + rad} L ${r} ${b - rad - ih * 0.18} Q ${r} ${b - ih * 0.18} ${r - rad} ${b - ih * 0.18} L ${tailX + 16} ${b - ih * 0.18} L ${tailX} ${b} L ${tailX + 4} ${b - ih * 0.18} L ${l + rad} ${b - ih * 0.18} Q ${l} ${b - ih * 0.18} ${l} ${b - rad - ih * 0.18} L ${l} ${t + rad} Q ${l} ${t} ${l + rad} ${t} Z`;
      return { kind: "path", d };
    }
    case "heart": {
      const d = `M ${cx} ${b} C ${l - iw * 0.1} ${t + ih * 0.55} ${l + iw * 0.15} ${t - ih * 0.1} ${cx} ${t + ih * 0.35} C ${r - iw * 0.15} ${t - ih * 0.1} ${r + iw * 0.1} ${t + ih * 0.55} ${cx} ${b} Z`;
      return { kind: "path", d };
    }
    case "cloud": {
      const d = `M ${l + iw * 0.25} ${b} C ${l} ${b} ${l} ${cy} ${l + iw * 0.2} ${cy} C ${l + iw * 0.2} ${t + ih * 0.1} ${l + iw * 0.55} ${t} ${l + iw * 0.6} ${t + ih * 0.25} C ${r - iw * 0.1} ${t + ih * 0.05} ${r} ${cy * 0.9} ${r - iw * 0.15} ${cy} C ${r} ${cy} ${r} ${b} ${l + iw * 0.75} ${b} Z`;
      return { kind: "path", d };
    }
    default: return { kind: "rect", round: false };
  }
}
