/**
 * A tiny subsequence scorer for the command palette. Higher is better; `null`
 * means the query is not a subsequence of the text at all. Consecutive and
 * word-start matches are rewarded so "np" finds "New page" ahead of noise.
 */
export function fuzzyScore(query: string, text: string): number | null {
  const q = query.trim().toLowerCase();
  if (!q) return 0;
  const t = text.toLowerCase();
  let score = 0;
  let cursor = 0;
  let streak = 0;

  for (const char of q) {
    const index = t.indexOf(char, cursor);
    if (index === -1) return null;
    streak = index === cursor ? streak + 1 : 0;
    score += 1 + streak * 2;
    if (index === 0) score += 3;
    if (index > 0 && t[index - 1] === " ") score += 2;
    score -= (index - cursor) * 0.05;
    cursor = index + 1;
  }

  return score;
}

export function fuzzyFilter<T>(
  query: string,
  items: readonly T[],
  key: (item: T) => string,
): T[] {
  if (!query.trim()) return [...items];
  return items
    .map((item) => ({ item, score: fuzzyScore(query, key(item)) }))
    .filter((entry): entry is { item: T; score: number } => entry.score !== null)
    .sort((a, b) => b.score - a.score)
    .map((entry) => entry.item);
}
