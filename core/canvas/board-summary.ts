/** Minimal node shape, so this stays independent of the store and React Flow. */
export type BoardNode = {
  id: string;
  type?: string;
  data: {
    text?: string;
    purpose?: string;
    table?: { columns: { name: string; type: string }[] };
    code?: { language: string };
    wireframe?: { title: string; device?: string };
  };
};

export type BoardEdge = { source: string; target: string; label?: string };

export type BoardSummary = {
  /** Text handed to the model. Empty when the board is empty. */
  text: string;
  /** Short handle the model can reference -> the real node id on the canvas. */
  handles: Record<string, string>;
};

/** Type name the model already knows from the scene vocabulary. */
const SCENE_TYPE: Record<string, string> = {
  aiNode: "concept",
  noteNode: "note",
  groupNode: "group",
  tableNode: "table",
  codeNode: "code",
  imageNode: "image",
  videoNode: "video",
  wireframeNode: "wireframe",
  shapeNode: "shape",
  textNode: "note",
};

function describe(node: BoardNode): string {
  const type = SCENE_TYPE[node.type ?? ""] ?? "concept";
  const title = (node.data.text ?? "").trim() || "untitled";
  const parts = [`${type} "${title}"`];

  const columns = node.data.table?.columns;
  if (columns?.length) parts.push(`columns: ${columns.map((c) => c.name).join(", ")}`);
  if (node.data.code) parts.push(`${node.data.code.language} snippet`);
  if (node.data.wireframe) {
    parts.push(`${node.data.wireframe.device ?? "screen"} wireframe`);
  }
  const body = (node.data.purpose ?? "").trim();
  if (body) parts.push(body.slice(0, 80));

  return parts.join(" — ");
}

/**
 * Renders what is already on the canvas, with a stable handle per node, so a
 * follow-up prompt can extend or amend the board instead of starting over.
 *
 * Pen strokes are skipped: they are ink, not structure, and there can be
 * hundreds of them.
 */
export function summarizeBoard(
  nodes: BoardNode[],
  edges: BoardEdge[] = [],
  limit = 40,
): BoardSummary {
  const meaningful = nodes.filter((n) => n.type !== "drawNode");
  if (meaningful.length === 0) return { text: "", handles: {} };

  const shown = meaningful.slice(0, limit);
  const handles: Record<string, string> = {};
  const handleOf = new Map<string, string>();
  shown.forEach((node, i) => {
    const handle = `#${i + 1}`;
    handles[handle] = node.id;
    handleOf.set(node.id, handle);
  });

  const lines = shown.map((node) => `${handleOf.get(node.id)} ${describe(node)}`);

  // Only edges between nodes the model can actually see are worth listing.
  const links = edges
    .filter((e) => handleOf.has(e.source) && handleOf.has(e.target))
    .map((e) => {
      const label = e.label ? ` (${e.label})` : "";
      return `${handleOf.get(e.source)} -> ${handleOf.get(e.target)}${label}`;
    });

  const text = [
    "Nodes already on the board:",
    ...lines,
    ...(links.length ? ["Existing connections:", ...links] : []),
    ...(meaningful.length > shown.length
      ? [`(and ${meaningful.length - shown.length} more not listed)`]
      : []),
  ].join("\n");

  return { text, handles };
}
