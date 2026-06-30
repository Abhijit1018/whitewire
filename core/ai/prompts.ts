export function buildExpandPrompt(text: string): string {
  return [
    `Break the following concept into 3 to 7 concise, distinct sub-components.`,
    `Concept: "${text}"`,
    `Reply with ONLY a JSON array of short strings (no prose, no markdown).`,
    `Example: ["Email field", "Password field", "OAuth login"]`,
  ].join("\n");
}

/** Defensive: bare JSON array, fenced ```json, or bullet/numbered lines -> string[]. */
export function parseExpandResponse(raw: string): string[] {
  const clean = (arr: unknown[]): string[] =>
    arr.map((s) => String(s).trim()).filter((s) => s.length > 0);

  const tryJson = (s: string): string[] | null => {
    try {
      const v = JSON.parse(s);
      return Array.isArray(v) ? clean(v) : null;
    } catch {
      return null;
    }
  };

  const trimmed = raw.trim();
  const direct = tryJson(trimmed);
  if (direct) return direct;

  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i)?.[1];
  if (fenced) {
    const j = tryJson(fenced.trim());
    if (j) return j;
  }
  const bracket = trimmed.match(/\[[\s\S]*\]/)?.[0];
  if (bracket) {
    const j = tryJson(bracket);
    if (j) return j;
  }

  return trimmed
    .split("\n")
    .map((l) => l.replace(/^\s*(?:[-*•]|\d+[.)])\s*/, "").trim())
    .filter((l) => l.length > 0);
}
