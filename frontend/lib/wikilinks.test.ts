import { describe, expect, it } from "vitest";
import type { LocalNote } from "../db/dexie";
import {
  backlinksFor,
  buildTitleIndex,
  normalizeTitle,
  parseWikiLinks,
  resolveWikiLink,
} from "./wikilinks";

function note(partial: Partial<LocalNote> & { id: string }): LocalNote {
  return {
    title: "",
    body: "",
    folder: null,
    tags: [],
    createdAt: 0,
    updatedAt: 0,
    deleted: false,
    version: 1,
    baseVersion: 1,
    dirty: 0,
    ...partial,
  };
}

describe("parseWikiLinks", () => {
  it("reads targets and aliases", () => {
    expect(parseWikiLinks("See [[Opening a portal|the portal]].")).toEqual([
      { target: "Opening a portal", alias: "the portal" },
    ]);
  });

  it("ignores links inside code", () => {
    expect(parseWikiLinks("`[[nope]]`\n```\n[[also no]]\n```\n[[yes]]")).toEqual(
      [{ target: "yes", alias: null }],
    );
  });
});

describe("title resolution", () => {
  const notes = [
    note({ id: "old", title: "Opening a portal", updatedAt: 10 }),
    note({ id: "new", title: "Opening  A  Portal", updatedAt: 20 }),
    note({ id: "dead", title: "Opening a portal", updatedAt: 30, deleted: true }),
  ];

  it("normalises case and whitespace", () => {
    expect(normalizeTitle("  Opening   A Portal ")).toBe("opening a portal");
  });

  it("prefers the most recently updated living page", () => {
    expect(buildTitleIndex(notes).get("opening a portal")?.id).toBe("new");
    expect(resolveWikiLink("opening a portal", notes)?.id).toBe("new");
  });

  it("returns undefined for an unknown name", () => {
    expect(resolveWikiLink("Nothing here", notes)).toBeUndefined();
  });
});

describe("backlinksFor", () => {
  const target = note({ id: "target", title: "The Void" });
  const notes = [
    target,
    note({ id: "a", title: "A", body: "Recover from [[The Void]].", updatedAt: 5 }),
    note({ id: "b", title: "B", body: "Nothing.", updatedAt: 9 }),
    note({ id: "c", title: "C", body: "`[[The Void]]`", updatedAt: 12 }),
  ];

  it("finds pages that point here, newest first", () => {
    const found = backlinksFor(target, notes);
    expect(found.map((item) => item.id)).toEqual(["a"]);
  });

  it("returns nothing for an untitled page", () => {
    expect(backlinksFor(note({ id: "x" }), notes)).toEqual([]);
  });
});
