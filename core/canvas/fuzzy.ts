/**
 * Subsequence fuzzy scorer. Returns a score where LOWER is a better match, or
 * `null` when `query` is not a subsequence of `text` (case-insensitive).
 * An empty query matches everything with score 0.
 */
export function fuzzyScore(text: string, query: string): number | null {
  if (!query) return 0;
  const t = text.toLowerCase();
  const q = query.toLowerCase();

  let ti = 0;
  let gapScore = 0;
  let firstIndex = -1;
  for (let qi = 0; qi < q.length; qi++) {
    let found = -1;
    for (let j = ti; j < t.length; j++) {
      if (t[j] === q[qi]) { found = j; break; }
    }
    if (found === -1) return null;
    if (firstIndex === -1) firstIndex = found;
    if (qi > 0) gapScore += found - ti; // penalize gaps between matched chars
    ti = found + 1;
  }
  // Prefer earlier first match, tighter matches, and shorter overall text.
  return gapScore + firstIndex * 0.5 + t.length * 0.05;
}

/** Filter + rank items by a query against a string key. Stable for ties. */
export function fuzzyFilter<T>(items: T[], query: string, key: (item: T) => string): T[] {
  const scored = items
    .map((item, i) => ({ item, i, score: fuzzyScore(key(item), query) }))
    .filter((s): s is { item: T; i: number; score: number } => s.score !== null);
  scored.sort((a, b) => a.score - b.score || a.i - b.i);
  return scored.map((s) => s.item);
}
