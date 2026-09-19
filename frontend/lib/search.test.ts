import { describe, expect, it } from "vitest";
import type { LocalNote } from "../db/dexie";
import { buildSearchIndex, searchNoteIds } from "./search";

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

const notes: LocalNote[] = [
  note({
    id: "portal",
    title: "Opening a portal",
    body: "The sending stone hums with arcane energy.",
    tags: ["arcane"],
    folder: "Rituals",
  }),
  note({
    id: "grocery",
    title: "Milk and bread",
    body: "Also pick up candles for the ritual.",
    tags: ["errands"],
  }),
];

describe("search", () => {
  const index = buildSearchIndex(notes);

  it("returns null for an empty query (no filtering)", () => {
    expect(searchNoteIds(index, "   ")).toBeNull();
  });

  it("matches body text", () => {
    const ids = searchNoteIds(index, "sending stone");
    expect(ids?.has("portal")).toBe(true);
    expect(ids?.has("grocery")).toBe(false);
  });

  it("matches tags and folder", () => {
    expect(searchNoteIds(index, "arcane")?.has("portal")).toBe(true);
    expect(searchNoteIds(index, "rituals")?.has("portal")).toBe(true);
  });

  it("supports prefix matching", () => {
    expect(searchNoteIds(index, "port")?.has("portal")).toBe(true);
  });

  it("ranks title matches above body-only matches", () => {
    const ids = searchNoteIds(index, "ritual");
    expect(ids).not.toBeNull();
    expect(ids?.has("grocery")).toBe(true);
  });
});
