import { parseScene, SCENE_NODE_TYPES, type Scene } from "@/core/ai/scene";
import { parseWireframe, WIREFRAME_TYPES, type WireframeSpec } from "@/core/ai/wireframe";

/**
 * What the sketch turned out to be. The model chooses: a drawn screen becomes a
 * wireframe, anything structural becomes a scene of connected nodes.
 */
export type SketchPlan =
  | { mode: "wireframe"; spec: WireframeSpec }
  | { mode: "diagram"; scene: Scene };

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
    `{"mode":"wireframe","title":"Screen name","device":"desktop","elements":[{"type":"button","label":"Sign in","x":10,"y":80,"w":30,"h":8}]}`,
    'Set device to "desktop", "tablet" or "mobile" based on the drawn proportions —',
    "a tall narrow sketch is a phone screen, a wide one is desktop.",
    `Element types: ${WIREFRAME_TYPES.join(", ")}. x,y,w,h are percentages of a`,
    "100x100 grid. Keep the drawn arrangement — a shape near the top of the sketch",
    "stays near the top. Infer the obvious missing pieces of such a screen.",
    "",
    "If mode is diagram, reply with ONLY:",
    `{"mode":"diagram","nodes":[{"id":"box1","type":"concept","title":"short name","body":"one short line","size":"md"}],"edges":[{"from":"box1","to":"box2","label":"optional"}]}`,
    "Give exactly one node per listed shape, in the same order, and reuse the",
    "shape's own id (box1, box2, …) so positions line up with the drawing.",
    `Choose a type per node — ${SCENE_NODE_TYPES.join(", ")} — so a drawn database`,
    'becomes a "table" with columns and a drawn screen becomes a "wireframe",',
    'rather than everything becoming a "concept".',
    'A shape drawn inside another should set "parent" to the outer shape\'s id,',
    'and the outer one should be type "group".',
    "Keep the connections given below; do not invent shapes that were not drawn.",
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

  const scene = parseScene(raw);
  return scene.nodes.length > 0 ? { mode: "diagram", scene } : null;
}
