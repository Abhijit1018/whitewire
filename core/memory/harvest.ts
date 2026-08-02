import { normalizeTitle } from "./links";

export type BoardNodeLike = {
  id: string;
  type?: string;
  data?: { text?: string; purpose?: string };
};

export type BoardEdgeLike = { source: string; target: string; label?: string };

export type HarvestedProject = {
  projectId: string;
  projectName: string;
  nodes: BoardNodeLike[];
  edges: BoardEdgeLike[];
};

export type HarvestedNote = {
  /** Stable synthetic id — harvested notes are derived, never stored. */
  id: string;
  title: string;
  body: string;
  /** Projects this entity appears in, newest first by input order. */
  projects: { id: string; name: string }[];
  /** Titles of entities it connects to, from the boards' own edges. */
  links: string[];
  harvested: true;
};

/** Node types that carry a real entity rather than decoration or ink. */
const MEANINGFUL = new Set([
  "aiNode",
  "tableNode",
  "codeNode",
  "wireframeNode",
  "groupNode",
  "imageNode",
  "videoNode",
]);

/** Titles this generic are noise once pooled across every board. */
const TOO_GENERIC = new Set([
  "untitled", "new idea", "idea", "note", "group", "table", "screen", "code",
  "start", "end", "process", "decision", "user", "database", "your system",
]);

function titleOf(node: BoardNodeLike): string {
  return (node.data?.text ?? "").trim();
}

function isHarvestable(node: BoardNodeLike): boolean {
  if (!MEANINGFUL.has(node.type ?? "")) return false;
  const title = titleOf(node);
  if (title.length < 3) return false;
  return !TOO_GENERIC.has(normalizeTitle(title));
}

/**
 * Turns the boards a user has built into memory notes, with no model call and
 * no action from the user. An entity that appears on several boards becomes one
 * note that knows about all of them — which is what makes the graph worth
 * having: it shows where an idea recurs.
 */
export function harvestNotes(projects: HarvestedProject[]): HarvestedNote[] {
  const byTitle = new Map<string, HarvestedNote>();
  // Per project, map node id -> title so edges can be expressed between names.
  for (const project of projects) {
    const nameOf = new Map<string, string>();
    for (const node of project.nodes) {
      if (isHarvestable(node)) nameOf.set(node.id, titleOf(node));
    }

    for (const node of project.nodes) {
      const title = nameOf.get(node.id);
      if (!title) continue;
      const key = normalizeTitle(title);
      const existing = byTitle.get(key);
      const body = (node.data?.purpose ?? "").trim();

      if (existing) {
        if (!existing.projects.some((p) => p.id === project.projectId)) {
          existing.projects.push({ id: project.projectId, name: project.projectName });
        }
        // Keep the fullest description seen across boards.
        if (body.length > existing.body.length) existing.body = body;
      } else {
        byTitle.set(key, {
          id: `harvested:${key}`,
          title,
          body,
          projects: [{ id: project.projectId, name: project.projectName }],
          links: [],
          harvested: true,
        });
      }
    }

    for (const edge of project.edges) {
      const from = nameOf.get(edge.source);
      const to = nameOf.get(edge.target);
      if (!from || !to || normalizeTitle(from) === normalizeTitle(to)) continue;
      const note = byTitle.get(normalizeTitle(from));
      if (note && !note.links.some((l) => normalizeTitle(l) === normalizeTitle(to))) {
        note.links.push(to);
      }
    }
  }

  return [...byTitle.values()];
}

/** Renders a harvested note's body for display, including where it came from. */
export function describeHarvest(note: HarvestedNote): string {
  const where = note.projects.map((p) => p.name).join(", ");
  const links = note.links.map((l) => `[[${l}]]`).join(" ");
  return [note.body, links, `Seen in: ${where}`].filter(Boolean).join("\n\n");
}
