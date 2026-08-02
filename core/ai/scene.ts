import type { WireframeSpec } from "@/core/ai/wireframe";
import { parseWireframe } from "@/core/ai/wireframe";
import type { ShapeId } from "@/core/canvas/shapes";
import { SHAPES } from "@/core/canvas/shapes";

export const SCENE_NODE_TYPES = [
  "concept",
  "note",
  "group",
  "table",
  "code",
  "image",
  "video",
  "wireframe",
  "shape",
] as const;

export type SceneNodeType = (typeof SCENE_NODE_TYPES)[number];

export const SCENE_SIZES = ["sm", "md", "lg", "xl"] as const;
export type SceneSize = (typeof SCENE_SIZES)[number];

export type TableColumn = { name: string; type: string; key?: "pk" | "fk" };

export type SceneNode = {
  /** Model-assigned; referenced by edges and by `parent`. */
  id: string;
  type: SceneNodeType;
  title: string;
  body: string;
  /** Group membership. Resolved against real nodes; dangling refs are dropped. */
  parent?: string;
  size: SceneSize;
  table?: { columns: TableColumn[] };
  code?: { language: string; source: string };
  media?: { url?: string; caption?: string };
  wireframe?: WireframeSpec;
  shape?: ShapeId;
  /** Draw as a stack of N cards — "3 workers", "many FontFaces". 1 means single. */
  stack?: number;
};

export type SceneEdge = {
  from: string;
  to: string;
  label?: string;
  /** Second line under the label, as in numbered architecture diagrams. */
  note?: string;
  directed: boolean;
};

export const SCENE_LAYOUTS = ["flow", "mindmap", "tree", "matrix", "timeline"] as const;
export type SceneLayoutKind = (typeof SCENE_LAYOUTS)[number];

/** An edit to a node already on the board, addressed by its handle. */
export type SceneUpdate = { target: string; title?: string; body?: string };

export type Scene = {
  nodes: SceneNode[];
  edges: SceneEdge[];
  /** How the board is arranged. Defaults to a wrapping flow. */
  layout: SceneLayoutKind;
  /** Changes to existing nodes, so a follow-up amends instead of duplicating. */
  updates: SceneUpdate[];
  /**
   * Set when the model needs an answer before it can build anything. When
   * present the scene is otherwise empty and nothing is placed on the canvas.
   */
  question?: { text: string; options: string[] };
};

/** Pixel box for each size bucket, so content is not forced into one shape. */
export const SIZE_PX: Record<SceneSize, { width: number; height: number }> = {
  sm: { width: 180, height: 90 },
  md: { width: 260, height: 140 },
  lg: { width: 380, height: 240 },
  xl: { width: 560, height: 380 },
};

/** Types that carry enough content to deserve a bigger default box. */
const DEFAULT_SIZE: Partial<Record<SceneNodeType, SceneSize>> = {
  group: "xl",
  wireframe: "xl",
  code: "lg",
  table: "lg",
  image: "lg",
  video: "lg",
  note: "sm",
};

const SHAPE_IDS = new Set<string>(SHAPES.map((s) => s.id));

function str(v: unknown): string {
  return typeof v === "string" ? v.trim() : "";
}

/** "#3" — a reference to a node already on the board, not one in this scene. */
export function isHandle(ref: string): boolean {
  return /^#\d+$/.test(ref);
}

function parseUpdates(raw: unknown): SceneUpdate[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((u) => {
      const o = u as Record<string, unknown>;
      const target = str(o?.target) || str(o?.id) || str(o?.handle);
      return {
        target,
        title: str(o?.title) || undefined,
        body: str(o?.body) || str(o?.note) || undefined,
      };
    })
    // Only handles can be updated; a new node is expressed in `nodes`.
    .filter((u) => isHandle(u.target) && (u.title !== undefined || u.body !== undefined));
}

function asType(v: unknown): SceneNodeType {
  const t = str(v).toLowerCase();
  return (SCENE_NODE_TYPES as readonly string[]).includes(t)
    ? (t as SceneNodeType)
    : "concept";
}

function asSize(v: unknown, type: SceneNodeType): SceneSize {
  const s = str(v).toLowerCase();
  if ((SCENE_SIZES as readonly string[]).includes(s)) return s as SceneSize;
  return DEFAULT_SIZE[type] ?? "md";
}

function parseColumns(v: unknown): TableColumn[] {
  if (!Array.isArray(v)) return [];
  return v
    .map((c) => {
      const o = c as Record<string, unknown>;
      const key = str(o?.key).toLowerCase();
      return {
        name: str(o?.name),
        type: str(o?.type) || "text",
        key: key === "pk" || key === "fk" ? (key as "pk" | "fk") : undefined,
      };
    })
    .filter((c) => c.name.length > 0);
}

/** Attaches the payload that matches the node's type, ignoring the rest. */
function parsePayload(type: SceneNodeType, raw: Record<string, unknown>): Partial<SceneNode> {
  switch (type) {
    case "table": {
      const columns = parseColumns((raw.table as Record<string, unknown>)?.columns ?? raw.columns);
      return columns.length ? { table: { columns } } : {};
    }
    case "code": {
      const code = (raw.code ?? {}) as Record<string, unknown>;
      const source = str(code.source) || str(raw.source);
      return source ? { code: { language: str(code.language) || "text", source } } : {};
    }
    case "image":
    case "video": {
      const media = (raw.media ?? {}) as Record<string, unknown>;
      const url = str(media.url) || str(raw.url);
      const caption = str(media.caption);
      return url || caption ? { media: { url: url || undefined, caption: caption || undefined } } : {};
    }
    case "wireframe": {
      const spec = raw.wireframe;
      if (!spec) return {};
      const parsed = parseWireframe(JSON.stringify(spec));
      return parsed.elements.length ? { wireframe: parsed } : {};
    }
    case "shape": {
      const shape = str(raw.shape);
      return SHAPE_IDS.has(shape) ? { shape: shape as ShapeId } : {};
    }
    default:
      return {};
  }
}

function parseNode(raw: unknown, index: number): SceneNode | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  const title = str(o.title) || str(o.label) || str(o.name);
  const type = asType(o.type);
  // A node with neither a title nor a payload carries no information.
  if (!title && type === "concept") return null;

  const stack = Math.floor(Number(o.stack));
  return {
    id: str(o.id) || `n${index + 1}`,
    type,
    title,
    body: str(o.body) || str(o.note) || str(o.description),
    parent: str(o.parent) || undefined,
    size: asSize(o.size, type),
    // Beyond a handful the offset layers stop reading as a stack.
    ...(Number.isFinite(stack) && stack > 1 ? { stack: Math.min(stack, 6) } : {}),
    ...parsePayload(type, o),
  };
}

/**
 * Drops group references that point nowhere, at themselves, or that form a
 * cycle — React Flow would otherwise render an orphan or loop forever.
 */
function resolveParents(nodes: SceneNode[]): SceneNode[] {
  const byId = new Map(nodes.map((n) => [n.id, n]));

  return nodes.map((node) => {
    if (!node.parent) return node;
    if (node.parent === node.id || !byId.has(node.parent)) {
      return { ...node, parent: undefined };
    }
    // Walk up; a repeat means the chain loops back on itself.
    const seen = new Set([node.id]);
    let cursor = byId.get(node.parent);
    while (cursor) {
      if (seen.has(cursor.id)) return { ...node, parent: undefined };
      seen.add(cursor.id);
      cursor = cursor.parent ? byId.get(cursor.parent) : undefined;
    }
    return node;
  });
}

function parseEdges(raw: unknown, ids: Set<string>): SceneEdge[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((e): SceneEdge | null => {
      if (Array.isArray(e)) {
        const [from, to] = e.map((v) => String(v));
        return { from, to, directed: true };
      }
      if (!e || typeof e !== "object") return null;
      const o = e as Record<string, unknown>;
      return {
        from: str(o.from) || str(o.source),
        to: str(o.to) || str(o.target),
        label: str(o.label) || undefined,
        note: str(o.note) || undefined,
        directed: o.directed === false ? false : true,
      };
    })
    .filter((e): e is SceneEdge => {
      if (!e || e.from === e.to) return false;
      // An endpoint is either a node in this scene or a handle for one already
      // on the board (#1, #2, …), which the adapter resolves to a real id.
      const known = (ref: string) => ids.has(ref) || isHandle(ref);
      return known(e.from) && known(e.to);
    });
}

/**
 * Reads a scene from a model reply. Lenient by design: an unknown type becomes
 * a concept, a bad payload is dropped while the node survives, and prose around
 * the JSON is ignored.
 */
export function parseScene(rawText: string): Scene {
  const empty: Scene = { nodes: [], edges: [], layout: "flow", updates: [] };
  const match = rawText.match(/\{[\s\S]*\}/);
  if (!match) return empty;

  let obj: Record<string, unknown>;
  try {
    obj = JSON.parse(match[0]) as Record<string, unknown>;
  } catch {
    return empty;
  }

  const rawNodes = Array.isArray(obj.nodes) ? obj.nodes : [];
  const parsed = rawNodes
    .map((n, i) => parseNode(n, i))
    .filter((n): n is SceneNode => n !== null);

  // Later duplicates of an id would silently capture edges meant for the first.
  const seen = new Set<string>();
  const unique = parsed.filter((n) => (seen.has(n.id) ? false : (seen.add(n.id), true)));

  const nodes = resolveParents(unique);
  const layout = str(obj.layout).toLowerCase();

  // A question only counts when the model actually withheld a board; if it
  // asked *and* answered, the board is what the user wanted.
  const questionText = str((obj.question as Record<string, unknown>)?.text ?? obj.question);
  const question =
    questionText && nodes.length === 0
      ? {
          text: questionText,
          options: Array.isArray((obj.question as Record<string, unknown>)?.options)
            ? ((obj.question as Record<string, unknown>).options as unknown[])
                .map((o) => str(o))
                .filter((o) => o.length > 0)
                .slice(0, 4)
            : [],
        }
      : undefined;

  return {
    ...(question ? { question } : {}),
    nodes,
    edges: parseEdges(obj.edges, new Set(nodes.map((n) => n.id))),
    layout: (SCENE_LAYOUTS as readonly string[]).includes(layout)
      ? (layout as SceneLayoutKind)
      : "flow",
    updates: parseUpdates(obj.updates),
  };
}
