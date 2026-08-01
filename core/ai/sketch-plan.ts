import { parseBlueprint, type BlueprintNode } from "@/core/ai/blueprint";
import { parseWireframe, WIREFRAME_TYPES, type WireframeSpec } from "@/core/ai/wireframe";

/**
 * What the sketch turned out to be. The model chooses: a drawn screen becomes a
 * wireframe, anything structural becomes a connected board.
 */
export type SketchPlan =
  | { mode: "wireframe"; spec: WireframeSpec }
  | { mode: "diagram"; nodes: BlueprintNode[]; edges: [number, number][] };

export function buildSketchPlanPrompt(description: string): string {
  return [
    "You are reading a rough hand-drawn sketch that has already been converted",
    "from pen strokes into geometry. Positions are canvas pixels; y grows downward.",
    "Handwriting was read by OCR, so labels may be partial or slightly wrong —",
    "use them as hints and correct obvious misreads.",
    "",
    "First decide what the person was drawing:",
    '- A user interface / app screen / page layout  -> mode "wireframe"',
    '- A system, flow, architecture or concept map  -> mode "diagram"',
    "Boxes stacked inside one frame, a bar across the top, or button-like shapes",
    "with words in them mean a screen. Boxes joined by arrows mean a diagram.",
    "",
    "If mode is wireframe, reply with ONLY:",
    `{"mode":"wireframe","title":"Screen name","elements":[{"type":"button","label":"Sign in","x":10,"y":80,"w":30,"h":8}]}`,
    `Element types: ${WIREFRAME_TYPES.join(", ")}. x,y,w,h are percentages of a`,
    "100x100 grid. Keep the drawn arrangement — a shape near the top of the sketch",
    "stays near the top. Infer the obvious missing pieces of such a screen.",
    "",
    "If mode is diagram, reply with ONLY:",
    `{"mode":"diagram","nodes":[{"title":"short name","kind":"feature|component|entity|idea","note":"one short line"}],"edges":[[fromIndex,toIndex]]}`,
    "Give exactly one node per listed shape, in the same order, so edges can",
    "reference them by 0-based index. Keep the connections and nesting given below;",
    "do not invent shapes that were not drawn.",
    "",
    description,
  ].join("\n");
}

/** Reads the model's reply, falling back to a diagram when the mode is missing. */
export function parseSketchPlan(raw: string): SketchPlan | null {
  const match = raw.match(/\{[\s\S]*\}/);
  if (!match) return null;

  let mode = "";
  try {
    const obj = JSON.parse(match[0]) as Record<string, unknown>;
    mode = String(obj.mode ?? "").toLowerCase();
  } catch {
    // Malformed JSON still gets a chance below — both parsers are lenient.
  }

  if (mode === "wireframe") {
    const spec = parseWireframe(raw);
    return spec.elements.length > 0 ? { mode: "wireframe", spec } : null;
  }

  const bp = parseBlueprint(raw);
  return bp.nodes.length > 0 ? { mode: "diagram", nodes: bp.nodes, edges: bp.edges } : null;
}
