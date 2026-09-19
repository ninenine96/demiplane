/** Shared types between the Worker API and the frontend. */

export interface Note {
  id: string;
  title: string;
  body: string;
  folder: string | null;
  tags: string[];
  createdAt: number;
  updatedAt: number;
  deleted: boolean;
  version: number;
}

/** Note metadata without the body, for list views and sync previews. */
export type NoteMeta = Omit<Note, "body">;

export interface NoteInput {
  title: string;
  body: string;
  folder: string | null;
  tags: string[];
}

/** One entry in the pull delta, including tombstones. */
export interface SyncChange {
  seq: number;
  note: Note;
  op: "upsert" | "delete";
}

export interface SyncPullResponse {
  changes: SyncChange[];
  cursor: number;
  serverTime: number;
}

/** What the client sends for each locally-modified note. */
export interface SyncPushItem extends NoteInput {
  id: string;
  createdAt: number;
  updatedAt: number;
  deleted: boolean;
  baseVersion: number;
}

export interface SyncPushResult {
  id: string;
  version: number;
  updatedAt: number;
  status: "applied" | "conflict";
  conflictId?: string;
}

export interface SyncPushResponse {
  results: SyncPushResult[];
  cursor: number;
}

export interface ApiError {
  error: string;
  message: string;
  messagePlain: string;
}

export interface ApiOk<T> {
  data: T;
}

export interface Attachment {
  id: string;
  noteId: string;
  filename: string;
  contentType: string | null;
  size: number | null;
  createdAt: number;
  /** Authenticated URL the frontend can render or link to. */
  url: string;
}
