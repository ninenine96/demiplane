import { describe, expect, it } from "vitest";
import type { Note } from "../../shared/types";
import { parseNote, serializeNote } from "./frontmatter";

const base: Note = {
  id: "note-1",
  title: "The Keeper's Ledger",
  body: "# Session 12\n\nWe opened a portal and took notes.",
  folder: "Campaign/Notes",
  tags: ["dnd", "session"],
  createdAt: 1700000000000,
  updatedAt: 1700000001000,
  deleted: false,
  version: 3,
};

describe("frontmatter", () => {
  it("round-trips a note through markdown", () => {
    const parsed = parseNote("fallback", serializeNote(base));
    expect(parsed.id).toBe(base.id);
    expect(parsed.title).toBe(base.title);
    expect(parsed.body).toBe(base.body);
    expect(parsed.folder).toBe(base.folder);
    expect(parsed.tags).toEqual(base.tags);
    expect(parsed.createdAt).toBe(base.createdAt);
    expect(parsed.updatedAt).toBe(base.updatedAt);
  });

  it("keeps a null folder as null", () => {
    const parsed = parseNote("x", serializeNote({ ...base, folder: null }));
    expect(parsed.folder).toBeNull();
  });

  it("preserves titles containing colons and quotes", () => {
    const tricky = { ...base, title: 'On "sending stones": a study' };
    const parsed = parseNote("x", serializeNote(tricky));
    expect(parsed.title).toBe(tricky.title);
  });

  it("reads a file with no frontmatter as pure body", () => {
    const parsed = parseNote("plain-id", "just some words");
    expect(parsed.id).toBe("plain-id");
    expect(parsed.body).toBe("just some words");
    expect(parsed.tags).toEqual([]);
  });
});
