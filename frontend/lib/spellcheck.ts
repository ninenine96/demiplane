import type { NSpell } from "nspell";

/**
 * The demiplane's lexicon: an offline Hunspell dictionary loaded lazily so it
 * never weighs on first paint. Words the keeper inscribes are remembered in
 * `localStorage` and folded back in on the next visit.
 *
 * The heavy dictionary chunk is imported on demand; every helper here is safe
 * to call before it resolves (they answer "no misspelling" until it is ready).
 */

/** Broadcast when the personal lexicon changes so underlines can be redrawn. */
export const LEXICON_EVENT = "demiplane:lexicon-changed";

const LEXICON_KEY = "demiplane.lexicon";

/** A word-ish span: letters with internal apostrophes or hyphens. */
export const WORD_PATTERN = /[A-Za-z][A-Za-z'’-]*/g;

const WIKILINK_PATTERN = /\[\[([^\]\n|]+)(?:\|[^\]]*)?\]\]/g;

let speller: NSpell | null = null;
let loading: Promise<NSpell | null> | null = null;

function storage(): Storage | null {
  try {
    return typeof window === "undefined" ? null : window.localStorage;
  } catch {
    return null;
  }
}

function readPersonal(): string[] {
  const store = storage();
  if (!store) return [];
  try {
    const raw = JSON.parse(store.getItem(LEXICON_KEY) ?? "[]");
    return Array.isArray(raw) ? raw.filter((w): w is string => typeof w === "string") : [];
  } catch {
    return [];
  }
}

function writePersonal(words: string[]): void {
  storage()?.setItem(LEXICON_KEY, JSON.stringify(words));
}

/** Build the spell-checker once, then reuse it. Resolves `null` on failure. */
export function loadSpell(): Promise<NSpell | null> {
  if (speller) return Promise.resolve(speller);
  if (loading) return loading;
  loading = (async () => {
    try {
      // Vendored English Hunspell dictionary (`dictionary-en` v4, MIT AND BSD);
      // see `spellcheck-dictionary/LICENSE`. The npm package loads its files
      // through Node `fs`, so the raw files are copied here for the browser.
      const [{ default: nspell }, { default: aff }, { default: dic }] =
        await Promise.all([
          import("nspell"),
          import("./spellcheck-dictionary/en.aff?raw"),
          import("./spellcheck-dictionary/en.dic?raw"),
        ]);
      const instance = nspell(aff, dic);
      for (const word of readPersonal()) instance.add(word);
      speller = instance;
      return instance;
    } catch {
      return null;
    }
  })();
  return loading;
}

/** Trims the punctuation a click or tokeniser may have swept in. */
export function cleanWord(word: string): string {
  return word.replace(/^[^A-Za-z]+/, "").replace(/[^A-Za-z]+$/, "");
}

export function isMisspelled(word: string): boolean {
  if (!speller) return false;
  const clean = cleanWord(word);
  if (clean.length < 3 || /[0-9]/.test(clean)) return false;
  return !speller.correct(clean);
}

/** Candidate corrections, best first. Empty when the word is known. */
export function suggestionsFor(word: string, limit = 6): string[] {
  if (!speller) return [];
  const clean = cleanWord(word);
  if (!clean || speller.correct(clean)) return [];

  // Transposed neighbours are the commonest slip ("teh" → "the"); nspell has no
  // frequency data, so float these ahead of its edit-distance ranking.
  const ranked: string[] = [];
  for (let i = 0; i < clean.length - 1; i += 1) {
    const swapped =
      clean.slice(0, i) + clean.charAt(i + 1) + clean.charAt(i) + clean.slice(i + 2);
    if (swapped !== clean && speller.correct(swapped) && !ranked.includes(swapped)) {
      ranked.push(swapped);
    }
  }
  for (const option of speller.suggest(clean)) {
    if (!ranked.includes(option)) ranked.push(option);
  }
  return ranked.slice(0, limit);
}

/** The keeper's own words, shared across devices only by what they export. */
export function lexiconWords(): string[] {
  return readPersonal();
}

/** Inscribes a word so the lexicon stops questioning it. */
export function addToLexicon(word: string): void {
  const clean = cleanWord(word);
  if (clean.length === 0) return;
  speller?.add(clean);
  const words = readPersonal();
  if (!words.includes(clean)) writePersonal([...words, clean]);
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event(LEXICON_EVENT));
  }
}

export interface WordSpan {
  from: number;
  to: number;
  text: string;
}

/** The word under a line-relative offset, if the caret sits within one. */
export function wordAt(text: string, offset: number): WordSpan | null {
  for (const match of text.matchAll(WORD_PATTERN)) {
    const raw = match[0];
    const cleaned = cleanWord(raw);
    if (cleaned.length === 0) continue;
    const from = match.index + raw.indexOf(cleaned);
    const to = from + cleaned.length;
    if (offset >= from && offset <= to) {
      return { from, to, text: cleaned };
    }
  }
  return null;
}

/** The wiki target under a line-relative offset, if the caret sits within one. */
export function wikilinkAt(text: string, offset: number): string | null {
  for (const match of text.matchAll(WIKILINK_PATTERN)) {
    const end = match.index + match[0].length;
    if (offset >= match.index && offset <= end) {
      return (match[1] ?? "").trim();
    }
  }
  return null;
}

/** Spans the lexicon should never question: links, code and URLs. */
const PROTECTED_PATTERNS = [
  /\[\[[^\]\n]*\]\]/g,
  /\]\([^)\n]*\)/g,
  /https?:\/\/[^\s)\]]+/g,
  /`[^`\n]*`/g,
];

export interface Span {
  from: number;
  to: number;
}

/** Line-relative ranges that should be left to the scribe, not the lexicon. */
export function protectedRanges(text: string): Span[] {
  const ranges: Span[] = [];
  for (const pattern of PROTECTED_PATTERNS) {
    for (const match of text.matchAll(pattern)) {
      ranges.push({ from: match.index, to: match.index + match[0].length });
    }
  }
  return ranges;
}

export function isProtectedSpan(ranges: Span[], from: number, to: number): boolean {
  return ranges.some((range) => from < range.to && to > range.from);
}
