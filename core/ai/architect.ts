import { SCENE_NODE_TYPES, type SceneNodeType } from "@/core/ai/scene";

export type ArchitectSuggestion = {
  title: string;
  kind: string;
  /** Canvas node type to create when the suggestion is added. */
  type: SceneNodeType;
};
export type ArchitectResult = {
  missing: string[];
  suggestions: ArchitectSuggestion[];
  improvements: string[];
};

export function buildArchitectPrompt(board: string): string {
  return [
    "You are a software architect reviewing a product board.",
    "Nodes are concepts/components; connections are relationships.",
    "Analyze the board and reply with ONLY JSON of this exact shape:",
    `{"missing":["..."],"suggestions":[{"title":"...","kind":"component|feature|entity|idea","type":"concept"}],"improvements":["..."]}`,
    "- missing: important pieces not present yet",
    "- suggestions: concrete components, APIs, databases, or services to add",
    "- improvements: how to make the design better",
    `- type: which canvas node the suggestion should become — one of ${SCENE_NODE_TYPES.join(", ")}.`,
    '  Use "table" for a database or store, "wireframe" for a screen, "code" for',
    '  a snippet, "group" for a boundary, otherwise "concept".',
    "",
    "Board:",
    board,
  ].join("\n");
}

function toStringArray(x: unknown): string[] {
  if (!Array.isArray(x)) return [];
  return x.map((v) => String(v).trim()).filter((v) => v.length > 0);
}

/** Defensive parse of the architect JSON (handles fences / surrounding prose). */
export function parseArchitectResponse(raw: string): ArchitectResult {
  const empty: ArchitectResult = { missing: [], suggestions: [], improvements: [] };
  const match = raw.match(/\{[\s\S]*\}/);
  if (!match) return empty;
  let obj: unknown;
  try {
    obj = JSON.parse(match[0]);
  } catch {
    return empty;
  }
  const o = obj as Record<string, unknown>;
  const suggestions: ArchitectSuggestion[] = Array.isArray(o.suggestions)
    ? o.suggestions
        .map((s) => {
          const item = s as Record<string, unknown>;
          const type = String(item?.type ?? "").trim().toLowerCase();
          return {
            title: String(item?.title ?? "").trim(),
            kind: String(item?.kind ?? "idea").trim() || "idea",
            type: (SCENE_NODE_TYPES as readonly string[]).includes(type)
              ? (type as SceneNodeType)
              : ("concept" as SceneNodeType),
          };
        })
        .filter((s) => s.title.length > 0)
    : [];
  return {
    missing: toStringArray(o.missing),
    suggestions,
    improvements: toStringArray(o.improvements),
  };
}
