export type BlueprintNode = { title: string; kind: string; note: string };
export type Blueprint = { nodes: BlueprintNode[]; edges: [number, number][] };

export function buildBlueprintPrompt(request: string): string {
  return [
    "You are turning a product idea into a small board of connected concept nodes.",
    "Break the request into its key components/parts and how they relate.",
    "Reply with ONLY JSON of this exact shape:",
    `{"nodes":[{"title":"short name","kind":"feature|component|entity|idea","note":"one short line of detail"}],"edges":[[fromIndex,toIndex]]}`,
    "Use 4-9 nodes. edges reference node indexes (0-based, parent -> child). Titles short; detail goes in note.",
    "",
    `Request: ${request}`,
  ].join("\n");
}

export function parseBlueprint(raw: string): Blueprint {
  const empty: Blueprint = { nodes: [], edges: [] };
  const match = raw.match(/\{[\s\S]*\}/);
  if (!match) return empty;
  let obj: Record<string, unknown>;
  try {
    obj = JSON.parse(match[0]);
  } catch {
    return empty;
  }

  const rawNodes = Array.isArray(obj.nodes) ? obj.nodes : [];
  const nodes: BlueprintNode[] = rawNodes
    .map((n) => {
      const item = n as Record<string, unknown>;
      return {
        title: String(item?.title ?? "").trim(),
        kind: String(item?.kind ?? "idea").trim() || "idea",
        note: String(item?.note ?? "").trim(),
      };
    })
    .filter((n) => n.title.length > 0);

  const rawEdges = Array.isArray(obj.edges) ? obj.edges : [];
  const edges = rawEdges
    .map((e): [number, number] => {
      if (Array.isArray(e)) return [Number(e[0]), Number(e[1])];
      const o = e as Record<string, unknown>;
      return [Number(o?.from), Number(o?.to)];
    })
    .filter(
      ([a, b]) =>
        Number.isInteger(a) &&
        Number.isInteger(b) &&
        a >= 0 &&
        b >= 0 &&
        a < nodes.length &&
        b < nodes.length &&
        a !== b,
    );

  return { nodes, edges };
}
