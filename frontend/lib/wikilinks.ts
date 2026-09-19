import type { LocalNote } from "../db/dexie";

export interface WikiLink {
  target: string;
  alias: string | null;
}

const WIKILINK_RE = /\[\[([^\]|]+)(?:\|([^\]]+))?\]\]/g;

function stripCode(markdown: string): string {
  return markdown
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/~~~[\s\S]*?~~~/g, " ")
    .replace(/`[^`\n]*`/g, " ");
}

/** Every `[[target]]` / `[[target|alias]]` in a page, code excluded. */
export function parseWikiLinks(markdown: string): WikiLink[] {
  const prose = stripCode(markdown);
  const links: WikiLink[] = [];
  let match: RegExpExecArray | null;
  WIKILINK_RE.lastIndex = 0;
  while ((match = WIKILINK_RE.exec(prose)) !== null) {
    links.push({
      target: (match[1] ?? "").trim(),
      alias: match[2]?.trim() ?? null,
    });
  }
  return links;
}

export function normalizeTitle(title: string): string {
  return title.trim().toLowerCase().replace(/\s+/g, " ");
}

/** Maps a normalised title to its most recently updated, living page. */
export function buildTitleIndex(notes: LocalNote[]): Map<string, LocalNote> {
  const index = new Map<string, LocalNote>();
  for (const note of notes) {
    if (note.deleted || !note.title.trim()) continue;
    const key = normalizeTitle(note.title);
    const existing = index.get(key);
    if (!existing || note.updatedAt > existing.updatedAt) index.set(key, note);
  }
  return index;
}

export function resolveWikiLink(
  target: string,
  notes: LocalNote[],
): LocalNote | undefined {
  return buildTitleIndex(notes).get(normalizeTitle(target));
}

/** Pages that point here, newest first. */
export function backlinksFor(note: LocalNote, notes: LocalNote[]): LocalNote[] {
  const title = normalizeTitle(note.title);
  if (!title) return [];
  return notes
    .filter(
      (other) =>
        other.id !== note.id &&
        !other.deleted &&
        parseWikiLinks(other.body).some(
          (link) => normalizeTitle(link.target) === title,
        ),
    )
    .sort((a, b) => b.updatedAt - a.updatedAt);
}
