import "server-only";
import type { MemoryNoteLike } from "./links";

/** Words too common to say anything about which note is relevant. */
const STOP = new Set([
  "the", "and", "for", "with", "that", "this", "from", "into", "your", "our",
  "a", "an", "of", "to", "in", "on", "is", "are", "it", "as", "be", "by", "or",
  "add", "make", "want", "need", "build", "create", "board", "node", "nodes",
]);

function terms(text: string): Set<string> {
  return new Set(
    text
      .toLowerCase()
      .split(/[^a-z0-9]+/)
      .filter((w) => w.length > 2 && !STOP.has(w)),
  );
}

/**
 * Scores a note against the request by shared terms, weighting the title
 * heavily — a note called "Pricing" should win on a pricing question even if
 * its body never repeats the word.
 */
export function scoreNote(note: MemoryNoteLike, wanted: Set<string>): number {
  const title = terms(note.title);
  const body = terms(note.body);
  let score = 0;
  for (const term of wanted) {
    if (title.has(term)) score += 3;
    else if (body.has(term)) score += 1;
  }
  return score;
}

/** Picks the notes worth showing the model, newest-relevant first. */
export function selectRelevant(
  notes: MemoryNoteLike[],
  request: string,
  max = 5,
): MemoryNoteLike[] {
  const wanted = terms(request);
  if (wanted.size === 0) return [];
  return notes
    .map((note) => ({ note, score: scoreNote(note, wanted) }))
    .filter((n) => n.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, max)
    .map((n) => n.note);
}

/** Renders the chosen notes compactly, since they ride along in every prompt. */
export function renderRecall(notes: MemoryNoteLike[], bodyLimit = 400): string {
  return notes
    .map((n) => `- ${n.title}: ${n.body.replace(/\s+/g, " ").trim().slice(0, bodyLimit)}`)
    .join("\n");
}

/** Loads the account's notes and returns the relevant ones as prompt text. */
export async function recallFor(ownerId: string, request: string): Promise<string> {
  try {
    const { db } = await import("@/core/persistence/db");
    const { listNotes } = await import("@/core/persistence/memory.repo");
    const notes = await listNotes(db, ownerId);
    return renderRecall(selectRelevant(notes, request));
  } catch {
    // Memory is an enhancement — never block generation on it.
    return "";
  }
}
