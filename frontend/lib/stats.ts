/** Words in a page, ignoring code fences, code spans and link targets. */
export function countWords(markdown: string): number {
  const prose = markdown
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/~~~[\s\S]*?~~~/g, " ")
    .replace(/`[^`\n]*`/g, " ")
    .replace(/!?\[([^\]]*)\]\([^)]*\)/g, "$1 ")
    .replace(/[#>*_~|]/g, " ");
  return prose.trim().split(/\s+/).filter(Boolean).length;
}

export function readingMinutes(words: number, wordsPerMinute = 220): number {
  if (words === 0) return 0;
  return Math.max(1, Math.round(words / wordsPerMinute));
}
