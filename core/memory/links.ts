export type MemoryNoteLike = { id: string; title: string; body: string };

export type MemoryLink = { from: string; to: string };

export type MemoryGraph = {
  /** Notes that exist, plus placeholders for links pointing nowhere yet. */
  nodes: { id: string; title: string; exists: boolean }[];
  links: MemoryLink[];
};

const WIKI_LINK = /\[\[([^\][|]+)(?:\|[^\]]*)?\]\]/g;

/** Titles are matched case- and space-insensitively, as in Obsidian. */
export function normalizeTitle(title: string): string {
  return title.trim().toLowerCase().replace(/\s+/g, " ");
}

/**
 * Pulls [[wiki links]] out of a note body. The alias form [[Title|shown]] is
 * supported; the target is what counts. Duplicates collapse, order is kept.
 */
export function extractLinks(body: string): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const match of body.matchAll(WIKI_LINK)) {
    const title = match[1].trim();
    if (!title) continue;
    const key = normalizeTitle(title);
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(title);
  }
  return out;
}

/**
 * Builds the graph across a set of notes. A link to a title that does not exist
 * yet still appears, as an unresolved placeholder — that is how a knowledge
 * graph grows: you link first and write the note later.
 */
export function buildMemoryGraph(notes: MemoryNoteLike[]): MemoryGraph {
  const byTitle = new Map(notes.map((n) => [normalizeTitle(n.title), n]));
  const nodes: MemoryGraph["nodes"] = notes.map((n) => ({
    id: n.id,
    title: n.title,
    exists: true,
  }));
  const placeholders = new Map<string, string>();
  const links: MemoryLink[] = [];

  for (const note of notes) {
    for (const target of extractLinks(note.body)) {
      const key = normalizeTitle(target);
      if (key === normalizeTitle(note.title)) continue; // a note linking to itself adds nothing
      const existing = byTitle.get(key);
      if (existing) {
        links.push({ from: note.id, to: existing.id });
        continue;
      }
      let placeholderId = placeholders.get(key);
      if (!placeholderId) {
        placeholderId = `unresolved:${key}`;
        placeholders.set(key, placeholderId);
        nodes.push({ id: placeholderId, title: target, exists: false });
      }
      links.push({ from: note.id, to: placeholderId });
    }
  }

  return { nodes, links };
}

/** Notes that link *to* the given note — the backlinks panel. */
export function backlinksFor(noteId: string, graph: MemoryGraph): string[] {
  return graph.links.filter((l) => l.to === noteId).map((l) => l.from);
}
