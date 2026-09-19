import Dexie, { type Table } from "dexie";
import type { Note, NoteInput, SyncChange, SyncPushItem } from "../../shared/types";

export interface LocalNote {
  id: string;
  title: string;
  body: string;
  folder: string | null;
  tags: string[];
  createdAt: number;
  updatedAt: number;
  deleted: boolean;
  version: number;
  baseVersion: number;
  dirty: 0 | 1;
  /** 1 while a freshly-created page has never been edited. */
  draft?: 0 | 1;
}

interface MetaRow {
  key: string;
  value: string;
}

class DemiplaneDB extends Dexie {
  notes!: Table<LocalNote, string>;
  meta!: Table<MetaRow, string>;

  constructor() {
    super("demiplane");
    this.version(1).stores({
      notes: "id, folder, updatedAt, dirty",
      meta: "key",
    });
  }
}

export const db = new DemiplaneDB();

/** All local pages, newest first. */
export async function reloadNotes(): Promise<LocalNote[]> {
  const all = await db.notes.toArray();
  all.sort((a, b) => b.updatedAt - a.updatedAt);
  return all;
}

export function toLocal(note: Note, dirty: 0 | 1 = 0): LocalNote {
  return {
    id: note.id,
    title: note.title,
    body: note.body,
    folder: note.folder,
    tags: note.tags,
    createdAt: note.createdAt,
    updatedAt: note.updatedAt,
    deleted: note.deleted,
    version: note.version,
    baseVersion: note.version,
    dirty,
    draft: 0,
  };
}

/** A brand-new page that is not written to the demiplane until first edited. */
export async function createDraftLocal(id: string): Promise<LocalNote> {
  const now = Date.now();
  const draft: LocalNote = {
    id,
    title: "",
    body: "",
    folder: null,
    tags: [],
    createdAt: now,
    updatedAt: now,
    deleted: false,
    version: 0,
    baseVersion: 0,
    dirty: 0,
    draft: 1,
  };
  await db.notes.put(draft);
  return draft;
}

/** Deletes a local page outright (used to discard untouched drafts). */
export async function discardLocal(id: string): Promise<void> {
  await db.notes.delete(id);
}

/** Removes any drafts left behind by a previous session. */
export async function purgeDrafts(): Promise<void> {
  const drafts = await db.notes.filter((note) => note.draft === 1).toArray();
  if (drafts.length > 0) {
    await db.notes.bulkDelete(drafts.map((note) => note.id));
  }
}

export function toNote(local: LocalNote): Note {
  return {
    id: local.id,
    title: local.title,
    body: local.body,
    folder: local.folder,
    tags: local.tags,
    createdAt: local.createdAt,
    updatedAt: local.updatedAt,
    deleted: local.deleted,
    version: local.version,
  };
}

export function toPushItem(local: LocalNote): SyncPushItem {
  return {
    id: local.id,
    title: local.title,
    body: local.body,
    folder: local.folder,
    tags: local.tags,
    createdAt: local.createdAt,
    updatedAt: local.updatedAt,
    deleted: local.deleted,
    baseVersion: local.baseVersion,
  };
}

/** Applies a pulled server change unless the local copy has unsynced edits. */
export async function applyServerChange(change: SyncChange): Promise<void> {
  const existing = await db.notes.get(change.note.id);
  if (existing && existing.dirty === 1) return;
  await db.notes.put(toLocal(change.note, 0));
}

export async function upsertLocalEdit(
  id: string,
  patch: Partial<Pick<LocalNote, "title" | "body" | "folder" | "tags" | "deleted">>,
): Promise<LocalNote> {
  const existing = await db.notes.get(id);
  const now = Date.now();
  const next: LocalNote = existing
    ? { ...existing, ...patch, updatedAt: now, dirty: 1, draft: 0 }
    : {
        id,
        title: patch.title ?? "",
        body: patch.body ?? "",
        folder: patch.folder ?? null,
        tags: patch.tags ?? [],
        createdAt: now,
        updatedAt: now,
        deleted: patch.deleted ?? false,
        version: 0,
        baseVersion: 0,
        dirty: 1,
        draft: 0,
      };
  await db.notes.put(next);
  return next;
}

export function noteInputFromLocal(local: LocalNote): NoteInput {
  return {
    title: local.title,
    body: local.body,
    folder: local.folder,
    tags: local.tags,
  };
}

export async function getMeta(key: string, fallback: string): Promise<string> {
  const row = await db.meta.get(key);
  return row?.value ?? fallback;
}

export async function setMeta(key: string, value: string): Promise<void> {
  await db.meta.put({ key, value });
}
