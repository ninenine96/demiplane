import { FLAVOUR } from "../../shared/messages";
import type { Attachment } from "../../shared/types";
import { apiError, json } from "../lib/responses";

const MAX_ATTACHMENT_BYTES = 15 * 1024 * 1024;
const SAFE_NAME = /[^A-Za-z0-9._-]+/g;

const ALLOWED_TYPES = [
  /^image\//,
  /^application\/pdf$/,
  /^text\/plain$/,
  /^text\/markdown$/,
  /^application\/json$/,
];

interface AttachmentRow {
  id: string;
  note_id: string;
  r2_key: string;
  filename: string | null;
  content_type: string | null;
  size: number | null;
  created_at: number;
}

function attachmentKey(noteId: string, id: string, filename: string): string {
  return `attachments/${noteId}/${id}-${filename}`;
}

function sanitizeFilename(raw: string): string {
  const base = raw.split(/[/\\]/).pop() ?? "sack";
  const cleaned = base.replace(SAFE_NAME, "-").replace(/^-+|-+$/g, "");
  return cleaned.slice(0, 120) || "sack";
}

function rowToAttachment(row: AttachmentRow): Attachment {
  return {
    id: row.id,
    noteId: row.note_id,
    filename: row.filename ?? "sack",
    contentType: row.content_type,
    size: row.size,
    createdAt: row.created_at,
    url: `/api/attachments/${row.id}`,
  };
}

export async function handleAttachmentUpload(
  request: Request,
  env: Env,
  noteId: string,
): Promise<Response> {
  const note = await env.DB.prepare("SELECT id FROM notes WHERE id = ?1")
    .bind(noteId)
    .first<{ id: string }>();
  if (!note) {
    return apiError(404, FLAVOUR.notFound, "Note not found.");
  }

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return apiError(
      400,
      FLAVOUR.attachmentFailed,
      "Expected multipart form data.",
    );
  }

  const file = form.get("file");
  if (!(file instanceof File)) {
    return apiError(400, FLAVOUR.attachmentFailed, "No file was provided.");
  }
  if (file.size > MAX_ATTACHMENT_BYTES) {
    return apiError(
      413,
      "That is too heavy for the Haversack. Try something under 15 MB.",
      "Attachment exceeds the 15 MB limit.",
    );
  }

  const contentType = file.type || "application/octet-stream";
  if (!ALLOWED_TYPES.some((pattern) => pattern.test(contentType))) {
    return apiError(
      415,
      "The Haversack will not swallow that kind of trinket.",
      `Unsupported attachment type: ${contentType}`,
    );
  }

  const id = crypto.randomUUID();
  const filename = sanitizeFilename(file.name);
  const key = attachmentKey(noteId, id, filename);
  const createdAt = Date.now();

  const bytes = await file.arrayBuffer();
  await env.BUCKET.put(key, bytes, {
    httpMetadata: { contentType },
    customMetadata: { noteId, attachmentId: id, filename },
  });

  await env.DB.prepare(
    `INSERT INTO attachments (id, note_id, r2_key, filename, content_type, size, created_at)
     VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)`,
  )
    .bind(id, noteId, key, filename, contentType, file.size, createdAt)
    .run();

  const attachment: Attachment = {
    id,
    noteId,
    filename,
    contentType,
    size: file.size,
    createdAt,
    url: `/api/attachments/${id}`,
  };

  return json({ data: attachment }, { status: 201 });
}

export async function handleAttachmentList(
  env: Env,
  noteId: string,
): Promise<Response> {
  const { results } = await env.DB.prepare(
    `SELECT id, note_id, r2_key, filename, content_type, size, created_at
     FROM attachments WHERE note_id = ?1 ORDER BY created_at ASC`,
  )
    .bind(noteId)
    .all<AttachmentRow>();

  return json({ data: (results ?? []).map(rowToAttachment) });
}

export async function handleAttachmentGet(
  env: Env,
  id: string,
): Promise<Response> {
  const row = await env.DB.prepare(
    `SELECT id, note_id, r2_key, filename, content_type, size, created_at
     FROM attachments WHERE id = ?1`,
  )
    .bind(id)
    .first<AttachmentRow>();

  if (!row) {
    return apiError(404, FLAVOUR.notFound, "Attachment not found.");
  }

  const object = await env.BUCKET.get(row.r2_key);
  if (!object) {
    return apiError(404, FLAVOUR.notFound, "Attachment object missing.");
  }

  const headers = new Headers();
  headers.set("content-type", row.content_type ?? "application/octet-stream");
  headers.set("content-length", String(row.size ?? 0));
  headers.set("cache-control", "private, max-age=31536000, immutable");
  headers.set(
    "content-disposition",
    `inline; filename="${encodeURIComponent(row.filename ?? "sack")}"`,
  );

  return new Response(object.body, { headers });
}

export async function handleAttachmentDelete(
  env: Env,
  id: string,
): Promise<Response> {
  const row = await env.DB.prepare(
    "SELECT r2_key FROM attachments WHERE id = ?1",
  )
    .bind(id)
    .first<{ r2_key: string }>();

  if (!row) {
    return apiError(404, FLAVOUR.notFound, "Attachment not found.");
  }

  await env.BUCKET.delete(row.r2_key);
  await env.DB.prepare("DELETE FROM attachments WHERE id = ?1").bind(id).run();

  return json({ data: { id, message: "Returned to the Void." } });
}
