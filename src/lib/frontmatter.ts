import type { Note } from "../../shared/types";

/**
 * Markdown files carry their metadata as YAML frontmatter so an exported
 * grimoire is fully self-describing, even outside Demiplane.
 *
 * We only ever emit and read the handful of keys below, so a small purpose-built
 * parser is safer than pulling in a full YAML dependency.
 */
export interface Frontmatter {
  id?: string;
  title?: string;
  folder?: string | null;
  tags?: string[];
  created?: number;
  updated?: number;
}

const DELIMITER = "---";

export function serializeNote(note: Note): string {
  const lines = [
    DELIMITER,
    `id: ${JSON.stringify(note.id)}`,
    `title: ${JSON.stringify(note.title)}`,
    `folder: ${note.folder === null ? "null" : JSON.stringify(note.folder)}`,
    `tags: ${JSON.stringify(note.tags)}`,
    `created: ${note.createdAt}`,
    `updated: ${note.updatedAt}`,
    DELIMITER,
    "",
  ];
  return lines.join("\n") + note.body;
}

export function parseNote(fallbackId: string, text: string): Note {
  const parsed = splitFrontmatter(text);
  const fm = parsed.frontmatter;
  return {
    id: fm.id ?? fallbackId,
    title: fm.title ?? "",
    body: parsed.body,
    folder: fm.folder ?? null,
    tags: fm.tags ?? [],
    createdAt: fm.created ?? 0,
    updatedAt: fm.updated ?? 0,
    deleted: false,
    version: 1,
  };
}

function splitFrontmatter(text: string): {
  frontmatter: Frontmatter;
  body: string;
} {
  if (!text.startsWith(DELIMITER)) {
    return { frontmatter: {}, body: text };
  }
  const end = text.indexOf(`\n${DELIMITER}`, DELIMITER.length);
  if (end === -1) {
    return { frontmatter: {}, body: text };
  }
  const block = text.slice(DELIMITER.length, end).trim();
  const bodyStart = text.indexOf("\n", end + 1);
  const body = bodyStart === -1 ? "" : text.slice(bodyStart + 1).replace(/^\n/, "");
  return { frontmatter: parseBlock(block), body };
}

function parseBlock(block: string): Frontmatter {
  const fm: Frontmatter = {};
  for (const rawLine of block.split("\n")) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;
    const separator = line.indexOf(":");
    if (separator === -1) continue;
    const key = line.slice(0, separator).trim();
    const rawValue = line.slice(separator + 1).trim();

    switch (key) {
      case "id":
        fm.id = asString(rawValue);
        break;
      case "title":
        fm.title = asString(rawValue) ?? "";
        break;
      case "folder":
        fm.folder = rawValue === "null" ? null : asString(rawValue);
        break;
      case "tags":
        fm.tags = asStringArray(rawValue);
        break;
      case "created":
        fm.created = asNumber(rawValue);
        break;
      case "updated":
        fm.updated = asNumber(rawValue);
        break;
      default:
        break;
    }
  }
  return fm;
}

function asString(raw: string): string | undefined {
  if (!raw) return undefined;
  if (raw.startsWith('"')) {
    try {
      return JSON.parse(raw) as string;
    } catch {
      return raw.replace(/^"|"$/g, "");
    }
  }
  return raw;
}

function asNumber(raw: string): number | undefined {
  const value = Number(raw);
  return Number.isFinite(value) ? value : undefined;
}

function asStringArray(raw: string): string[] {
  if (!raw) return [];
  try {
    const parsed: unknown = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      return parsed.filter((item): item is string => typeof item === "string");
    }
  } catch {
    // fall through to comma-separated parsing
  }
  return raw
    .replace(/^\[|\]$/g, "")
    .split(",")
    .map((item) => item.trim().replace(/^["']|["']$/g, ""))
    .filter(Boolean);
}
