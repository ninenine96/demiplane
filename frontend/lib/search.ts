import MiniSearch from "minisearch";
import type { LocalNote } from "../db/dexie";

/**
 * Ranked, offline full-text search over the local Dexie mirror. Built fresh
 * whenever the note set changes; queries stay instant because everything is in
 * memory. Prefix + light fuzzy matching so "scry" finds "scrying" and typos
 * still land.
 */
export interface SearchDoc {
  id: string;
  title: string;
  body: string;
  tags: string;
  folder: string;
}

export type SearchIndex = MiniSearch<SearchDoc>;

function toDoc(note: LocalNote): SearchDoc {
  return {
    id: note.id,
    title: note.title,
    body: note.body,
    tags: note.tags.join(" "),
    folder: note.folder ?? "",
  };
}

export function buildSearchIndex(notes: LocalNote[]): SearchIndex {
  const index = new MiniSearch<SearchDoc>({
    fields: ["title", "body", "tags", "folder"],
    storeFields: ["id"],
    searchOptions: {
      boost: { title: 2, tags: 1.5 },
      prefix: true,
      fuzzy: 0.2,
      combineWith: "AND",
    },
  });
  index.addAll(notes.map(toDoc));
  return index;
}

/** Returns matching ids, or null when the query is empty (no filtering). */
export function searchNoteIds(
  index: SearchIndex,
  query: string,
): Set<string> | null {
  const trimmed = query.trim();
  if (!trimmed) return null;
  const results = index.search(trimmed);
  return new Set(results.map((result) => String(result.id)));
}
