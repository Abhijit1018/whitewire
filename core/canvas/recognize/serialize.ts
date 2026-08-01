import type { SketchGraph } from "./types";

const SHAPE_WORDS = {
  rect: "rectangle",
  ellipse: "ellipse",
  diamond: "diamond",
} as const;

const LOW_CONFIDENCE = 0.55;

function round(n: number): number {
  return Math.round(n);
}

/** Renders the recognized geometry as plain text a text-only model can reason over. */
export function describeGraph(graph: SketchGraph): string {
  const { shapes, connections, containment, looseLabels } = graph;
  if (shapes.length === 0 && connections.length === 0 && looseLabels.length === 0) return "";

  const lines: string[] = [];

  if (shapes.length > 0) {
    lines.push("Shapes:");
    for (const shape of shapes) {
      const parts = [
        `- ${shape.id}: ${SHAPE_WORDS[shape.kind]}`,
        `at (${round(shape.bbox.x)},${round(shape.bbox.y)})`,
        `size ${round(shape.bbox.w)}x${round(shape.bbox.h)}`,
      ];
      parts.push(shape.label ? `labelled "${shape.label}"` : "unlabelled");
      if (shape.confidence < LOW_CONFIDENCE) parts.push("(shape uncertain)");
      lines.push(parts.join(" "));
    }
  }

  if (connections.length > 0) {
    lines.push("Connections:");
    for (const c of connections) {
      lines.push(`- ${c.fromId} ${c.directed ? "->" : "--"} ${c.toId}`);
    }
  }

  if (containment.length > 0) {
    lines.push("Nesting:");
    for (const c of containment) lines.push(`- ${c.childId} is inside ${c.parentId}`);
  }

  if (looseLabels.length > 0) {
    lines.push(`Other handwriting: ${looseLabels.map((l) => `"${l}"`).join(", ")}`);
  }

  return lines.join("\n");
}

/**
 * Wraps the geometry description in instructions. Because this is plain text,
 * it runs on whatever model the user already has active — no vision required.
 */
export function buildSketchGraphPrompt(description: string): string {
  return [
    "Below is a hand-drawn sketch that has already been converted from pen strokes",
    "into geometry. Positions are canvas pixels; y grows downward.",
    "Interpret it as a UI or system diagram and name each shape meaningfully.",
    "Unlabelled shapes should be named from their position, size and connections.",
    "Reply with ONLY JSON of this exact shape:",
    `{"nodes":[{"title":"short name","kind":"feature|component|entity|idea","note":"one short line"}],"edges":[[fromIndex,toIndex]]}`,
    "One node per shape, in the order the shapes are listed, so edges can reference",
    "them by 0-based index. Preserve the connections and nesting given below.",
    "",
    description,
  ].join("\n");
}
