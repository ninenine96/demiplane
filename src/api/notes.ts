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

/**
 * Object keys are per-owner. A note id arrives from the client on sync push, so
 * two keepers can legitimately land on the same id — and they must never share
 * the same object.
 */
function noteKey(owner: string, id: string): string {
  return `notes/${owner}/${id}.md`;
}

function trashKeyFor(objectKey: string): string {
  return `trash/${objectKey}`;
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
export async function persistNote(
  env: Env,
  owner: string,
  note: Note,
): Promise<void> {
  const markdown = serializeNote(note);
  const contentHash = await sha256Hex(markdown);
  const r2Key = noteKey(owner, note.id);

  await env.BUCKET.put(r2Key, markdown, {
    httpMetadata: { contentType: "text/markdown; charset=utf-8" },
    customMetadata: { noteId: note.id, version: String(note.version) },
  });

  await env.DB.batch([
    env.DB.prepare(
      `INSERT INTO notes (owner, id, title, folder, tags, r2_key, created_at, updated_at, deleted, version, content_hash)
       VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11)
       ON CONFLICT(owner, id) DO UPDATE SET
         title = excluded.title,
         folder = excluded.folder,
         tags = excluded.tags,
         r2_key = excluded.r2_key,
         updated_at = excluded.updated_at,
         deleted = excluded.deleted,
         version = excluded.version,
         content_hash = excluded.content_hash`,
    ).bind(
      owner,
      note.id,
      note.title,
      note.folder,
      JSON.stringify(note.tags),
      r2Key,
      note.createdAt,
      note.updatedAt,
      note.deleted ? 1 : 0,
      note.version,
      contentHash,
    ),
    env.DB.prepare(
      `INSERT INTO change_log (owner, note_id, op, version, updated_at)
       VALUES (?1, ?2, ?3, ?4, ?5)`,
    ).bind(
      owner,
      note.id,
      note.deleted ? "delete" : "upsert",
      note.version,
      note.updatedAt,
    ),
  ]);
}

export async function listNotes(env: Env, owner: string): Promise<NoteMeta[]> {
  const { results } = await env.DB.prepare(
    `SELECT id, title, folder, tags, r2_key, created_at, updated_at, deleted, version, content_hash
     FROM notes WHERE owner = ?1 AND deleted = 0 ORDER BY updated_at DESC`,
  )
    .bind(owner)
    .all<NoteRow>();
  return (results ?? []).map(rowToMeta);
}

export async function getNoteById(
  env: Env,
  owner: string,
  id: string,
): Promise<Note | null> {
  const row = await getNoteRow(env, owner, id);
  return row ? rowToNote(env, row) : null;
}

/** The index row alone — callers that need the object key use this. */
async function getNoteRow(
  env: Env,
  owner: string,
  id: string,
): Promise<NoteRow | null> {
  return env.DB.prepare(
    `SELECT id, title, folder, tags, r2_key, created_at, updated_at, deleted, version, content_hash
     FROM notes WHERE owner = ?1 AND id = ?2`,
  )
    .bind(owner, id)
    .first<NoteRow>();
}

async function rowToNote(env: Env, row: NoteRow): Promise<Note> {
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
  owner: string,
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
  await persistNote(env, owner, note);
  return note;
}

export async function updateNote(
  env: Env,
  owner: string,
  id: string,
  input: NoteInput,
): Promise<Note | null> {
  const existing = await getNoteById(env, owner, id);
  if (!existing) return null;

  const updated: Note = {
    ...existing,
    ...input,
    updatedAt: Date.now(),
    version: existing.version + 1,
    deleted: false,
  };
  await persistNote(env, owner, updated);
  return updated;
}

export async function softDeleteNote(
  env: Env,
  owner: string,
  id: string,
): Promise<Note | null> {
  const row = await getNoteRow(env, owner, id);
  if (!row) return null;

  const existing = await rowToNote(env, row);

  await moveToTrash(env, row.r2_key);

  const deleted: Note = {
    ...existing,
    deleted: true,
    updatedAt: Date.now(),
    version: existing.version + 1,
  };
  await persistNote(env, owner, deleted);
  return deleted;
}

export async function undeleteNote(
  env: Env,
  owner: string,
  id: string,
): Promise<Note | null> {
  const row = await env.DB.prepare(
    `SELECT id, r2_key FROM notes WHERE owner = ?1 AND id = ?2 AND deleted = 1`,
  )
    .bind(owner, id)
    .first<{ id: string; r2_key: string }>();
  if (!row) return null;

  const existing = await restoreFromTrash(env, row.r2_key, id);
  if (!existing) return null;

  const restored: Note = {
    ...existing,
    deleted: false,
    updatedAt: Date.now(),
    version: existing.version + 1,
  };
  await persistNote(env, owner, restored);
  return restored;
}

async function moveToTrash(env: Env, objectKey: string): Promise<void> {
  const object = await env.BUCKET.get(objectKey);
  if (!object) return;
  await env.BUCKET.put(trashKeyFor(objectKey), object.body, {
    httpMetadata: { contentType: "text/markdown; charset=utf-8" },
  });
  await env.BUCKET.delete(objectKey);
}

async function restoreFromTrash(
  env: Env,
  objectKey: string,
  id: string,
): Promise<Note | null> {
  const object = await env.BUCKET.get(trashKeyFor(objectKey));
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
  owner: string,
  item: SyncPushItem,
): Promise<SyncPushResult> {
  const now = Date.now();
  const existingRow = await getNoteRow(env, owner, item.id);
  const existing = existingRow ? await rowToNote(env, existingRow) : null;

  let conflictId: string | undefined;
  if (existing && existing.version !== item.baseVersion) {
    conflictId = await preserveConflictCopy(env, owner, existing, now);
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

  if (item.deleted && existingRow) {
    await moveToTrash(env, existingRow.r2_key);
  }
  await persistNote(env, owner, note);

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
  owner: string,
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
  await persistNote(env, owner, copy);
  return copy.id;
}
