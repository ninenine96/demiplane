import type {
  Note,
  NoteInput,
  NoteMeta,
  SyncPushItem,
  SyncPushResult,
} from "../../shared/types";
import { sha256Hex } from "../lib/crypto";
import { serializeNote, parseNote } from "../lib/frontmatter";

interface NoteRow {
  id: string;
  title: string;
  folder: string | null;
  tags: string;
  r2_key: string;
  created_at: number;
  updated_at: number;
  deleted: number;
  version: number;
  content_hash: string | null;
}

function noteKey(id: string): string {
  return `notes/${id}.md`;
}

function trashKey(id: string): string {
  return `trash/notes/${id}.md`;
}

function rowToMeta(row: NoteRow): NoteMeta {
  return {
    id: row.id,
    title: row.title,
    folder: row.folder,
    tags: safeTags(row.tags),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    deleted: row.deleted === 1,
    version: row.version,
  };
}

function safeTags(raw: string): string[] {
  try {
    const parsed: unknown = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      return parsed.filter((tag): tag is string => typeof tag === "string");
    }
  } catch {
    // ignore malformed tag payloads
  }
  return [];
}

export function newNoteId(): string {
  return crypto.randomUUID();
}

/** Writes one note to R2 and updates the D1 index + change log atomically. */
export async function persistNote(env: Env, note: Note): Promise<void> {
  const markdown = serializeNote(note);
  const contentHash = await sha256Hex(markdown);

  await env.BUCKET.put(noteKey(note.id), markdown, {
    httpMetadata: { contentType: "text/markdown; charset=utf-8" },
    customMetadata: { noteId: note.id, version: String(note.version) },
  });

  await env.DB.batch([
    env.DB.prepare(
      `INSERT INTO notes (id, title, folder, tags, r2_key, created_at, updated_at, deleted, version, content_hash)
       VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10)
       ON CONFLICT(id) DO UPDATE SET
         title = excluded.title,
         folder = excluded.folder,
         tags = excluded.tags,
         r2_key = excluded.r2_key,
         updated_at = excluded.updated_at,
         deleted = excluded.deleted,
         version = excluded.version,
         content_hash = excluded.content_hash`,
    ).bind(
      note.id,
      note.title,
      note.folder,
      JSON.stringify(note.tags),
      noteKey(note.id),
      note.createdAt,
      note.updatedAt,
      note.deleted ? 1 : 0,
      note.version,
      contentHash,
    ),
    env.DB.prepare(
      "INSERT INTO change_log (note_id, op, version, updated_at) VALUES (?1, ?2, ?3, ?4)",
    ).bind(note.id, note.deleted ? "delete" : "upsert", note.version, note.updatedAt),
  ]);
}

export async function listNotes(env: Env): Promise<NoteMeta[]> {
  const { results } = await env.DB.prepare(
    `SELECT id, title, folder, tags, r2_key, created_at, updated_at, deleted, version, content_hash
     FROM notes WHERE deleted = 0 ORDER BY updated_at DESC`,
  ).all<NoteRow>();
  return (results ?? []).map(rowToMeta);
}

export async function getNoteById(
  env: Env,
  id: string,
): Promise<Note | null> {
  const row = await env.DB.prepare(
    `SELECT id, title, folder, tags, r2_key, created_at, updated_at, deleted, version, content_hash
     FROM notes WHERE id = ?1`,
  )
    .bind(id)
    .first<NoteRow>();

  if (!row) return null;

  const object = await env.BUCKET.get(row.r2_key);
  const body = object ? await object.text() : "";
  const parsed = parseNote(row.id, body);

  return {
    ...parsed,
    title: row.title,
    folder: row.folder,
    tags: safeTags(row.tags),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    deleted: row.deleted === 1,
    version: row.version,
  };
}

export async function createNote(
  env: Env,
  input: NoteInput,
): Promise<Note> {
  const now = Date.now();
  const note: Note = {
    id: newNoteId(),
    title: input.title,
    body: input.body,
    folder: input.folder,
    tags: input.tags,
    createdAt: now,
    updatedAt: now,
    deleted: false,
    version: 1,
  };
  await persistNote(env, note);
  return note;
}

export async function updateNote(
  env: Env,
  id: string,
  input: NoteInput,
): Promise<Note | null> {
  const existing = await getNoteById(env, id);
  if (!existing) return null;

  const updated: Note = {
    ...existing,
    ...input,
    updatedAt: Date.now(),
    version: existing.version + 1,
    deleted: false,
  };
  await persistNote(env, updated);
  return updated;
}

export async function softDeleteNote(
  env: Env,
  id: string,
): Promise<Note | null> {
  const existing = await getNoteById(env, id);
  if (!existing) return null;

  await moveToTrash(env, id);

  const deleted: Note = {
    ...existing,
    deleted: true,
    updatedAt: Date.now(),
    version: existing.version + 1,
  };
  await persistNote(env, deleted);
  return deleted;
}

export async function undeleteNote(
  env: Env,
  id: string,
): Promise<Note | null> {
  const row = await env.DB.prepare(
    "SELECT id FROM notes WHERE id = ?1 AND deleted = 1",
  )
    .bind(id)
    .first<{ id: string }>();
  if (!row) return null;

  const existing = await restoreFromTrash(env, id);
  if (!existing) return null;

  const restored: Note = {
    ...existing,
    deleted: false,
    updatedAt: Date.now(),
    version: existing.version + 1,
  };
  await persistNote(env, restored);
  return restored;
}

async function moveToTrash(env: Env, id: string): Promise<void> {
  const key = noteKey(id);
  const object = await env.BUCKET.get(key);
  if (!object) return;
  await env.BUCKET.put(trashKey(id), object.body, {
    httpMetadata: { contentType: "text/markdown; charset=utf-8" },
  });
  await env.BUCKET.delete(key);
}

async function restoreFromTrash(env: Env, id: string): Promise<Note | null> {
  const object = await env.BUCKET.get(trashKey(id));
  if (!object) return null;
  const text = await object.text();
  const parsed = parseNote(id, text);
  return { ...parsed, deleted: false };
}

/**
 * Applies one client change during sync. If the client's base version is stale,
 * the server's current copy is preserved as a conflict note so no timeline is
 * ever lost.
 */
export async function applySyncItem(
  env: Env,
  item: SyncPushItem,
): Promise<SyncPushResult> {
  const now = Date.now();
  const existing = await getNoteById(env, item.id);

  let conflictId: string | undefined;
  if (existing && existing.version !== item.baseVersion) {
    conflictId = await preserveConflictCopy(env, existing, now);
  }

  const nextVersion = existing ? existing.version + 1 : 1;
  const note: Note = {
    id: item.id,
    title: item.title,
    body: item.body,
    folder: item.folder,
    tags: item.tags,
    createdAt: existing?.createdAt ?? item.createdAt,
    updatedAt: now,
    deleted: item.deleted,
    version: nextVersion,
  };

  if (item.deleted) {
    await moveToTrash(env, item.id);
  }
  await persistNote(env, note);

  return {
    id: note.id,
    version: note.version,
    updatedAt: note.updatedAt,
    status: conflictId ? "conflict" : "applied",
    conflictId,
  };
}

async function preserveConflictCopy(
  env: Env,
  existing: Note,
  now: number,
): Promise<string> {
  const stamp = new Date(now)
    .toISOString()
    .slice(0, 16)
    .replace("T", " ");
  const copy: Note = {
    ...existing,
    id: newNoteId(),
    title: `${existing.title || "Untitled"} (conflict ${stamp})`,
    createdAt: now,
    updatedAt: now,
    deleted: false,
    version: 1,
  };
  await persistNote(env, copy);
  return copy.id;
}
