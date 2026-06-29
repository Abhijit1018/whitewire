import type { Editor, TLShape, TLShapeId } from "tldraw";
import { cleanup, type Box, type Edge } from "@/core/canvas/cleanup";

/** Reads selected shapes (or all page shapes if <2 selected), runs cleanup, applies positions. */
export function applyCleanup(editor: Editor) {
  const selected = editor.getSelectedShapes();
  const shapes: TLShape[] =
    selected.length >= 2 ? selected : editor.getCurrentPageShapes();

  const boxes: Box[] = [];
  const ids = new Set<TLShapeId>();
  for (const s of shapes) {
    if (s.type === "arrow") continue;
    const b = editor.getShapePageBounds(s.id);
    if (!b) continue;
    boxes.push({ id: s.id, x: b.x, y: b.y, w: b.w, h: b.h });
    ids.add(s.id);
  }
  if (boxes.length < 2) return;

  const edges: Edge[] = [];
  for (const s of shapes) {
    if (s.type !== "arrow") continue;
    const bindings = editor.getBindingsFromShape(s.id, "arrow");
    const start = bindings.find((b) => b.props.terminal === "start")?.toId;
    const end = bindings.find((b) => b.props.terminal === "end")?.toId;
    if (start && end && ids.has(start) && ids.has(end)) {
      edges.push({ from: start, to: end });
    }
  }

  const positions = cleanup(boxes, edges);
  editor.updateShapes(
    Object.entries(positions).map(([id, p]) => {
      const shape = editor.getShape(id as TLShapeId)!;
      return { id: id as TLShapeId, type: shape.type, x: p.x, y: p.y };
    }),
  );
}
