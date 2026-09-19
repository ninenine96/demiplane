import { strToU8, unzipSync, zipSync } from "fflate";
import { FLAVOUR } from "../../shared/messages";
import type { Note } from "../../shared/types";
import { parseNote } from "../lib/frontmatter";
import { apiError, json } from "../lib/responses";
import { newNoteId, persistNote } from "./notes";

interface ExportRow {
  id: string;
  r2_key: string;
}

interface AttachmentExportRow {
  id: string;
  r2_key: string;
  filename: string | null;
  content_type: string | null;
}

/** Builds a portable zip: markdown files plus their trinkets. */
export async function handleExport(env: Env): Promise<Response> {
  const { results: notes } = await env.DB.prepare(
    "SELECT id, r2_key FROM notes WHERE deleted = 0",
  ).all<ExportRow>();

  const files: Record<string, Uint8Array> = {};
  const manifest: Array<{ id: string; title: string }> = [];

  for (const note of notes ?? []) {
    const object = await env.BUCKET.get(note.r2_key);
    if (!object) continue;
    files[`notes/${note.id}.md`] = new Uint8Array(await object.arrayBuffer());

    const { results: attachments } = await env.DB.prepare(
      "SELECT id, r2_key, filename, content_type FROM attachments WHERE note_id = ?1",
    )
      .bind(note.id)
      .all<AttachmentExportRow>();

    for (const attachment of attachments ?? []) {
      const blob = await env.BUCKET.get(attachment.r2_key);
      if (!blob) continue;
      const name = attachment.filename ?? attachment.id;
      files[`attachments/${note.id}/${name}`] = new Uint8Array(
        await blob.arrayBuffer(),
      );
    }
  }

  files["demiplane-export.json"] = strToU8(
    JSON.stringify({ app: "Demiplane", exportedAt: Date.now(), manifest }, null, 2),
  );

  const zipped = zipSync(files, { level: 0 });
  const headers = new Headers();
  headers.set("content-type", "application/zip");
  headers.set(
    "content-disposition",
    'attachment; filename="demiplane-grimoire.zip"',
  );
  return new Response(zipped, { headers });
}

const CONTENT_TYPES: Record<string, string> = {
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  gif: "image/gif",
  webp: "image/webp",
  svg: "image/svg+xml",
  pdf: "application/pdf",
  txt: "text/plain",
  md: "text/markdown",
  json: "application/json",
};

function contentTypeFor(filename: string): string {
  const ext = filename.split(".").pop()?.toLowerCase() ?? "";
  return CONTENT_TYPES[ext] ?? "application/octet-stream";
}

/** Merges a previously exported grimoire back into the demiplane. */
export async function handleImport(
  request: Request,
  env: Env,
): Promise<Response> {
  let entries: Record<string, Uint8Array>;
  try {
    const buffer = new Uint8Array(await request.arrayBuffer());
    entries = unzipSync(buffer);
  } catch {
    return apiError(
      400,
      "That scroll could not be unrolled. Is it a Demiplane export?",
      "Invalid or unreadable zip archive.",
    );
  }

  const decoder = new TextDecoder();
  const idMap = new Map<string, string>();
  let imported = 0;
  let conflicts = 0;

  for (const [path, data] of Object.entries(entries)) {
    if (!path.startsWith("notes/") || !path.endsWith(".md")) continue;

    const fallbackId = path.replace(/^notes\//, "").replace(/\.md$/, "");
    const parsed = parseNote(fallbackId, decoder.decode(data));
    const existing = await env.DB.prepare("SELECT id FROM notes WHERE id = ?1")
      .bind(parsed.id)
      .first<{ id: string }>();

    if (existing) conflicts += 1;
    const now = Date.now();
    const id = existing ? newNoteId() : parsed.id;
    idMap.set(parsed.id, id);

    const note: Note = {
      ...parsed,
      id,
      createdAt: parsed.createdAt || now,
      updatedAt: now,
      deleted: false,
      version: 1,
    };
    await persistNote(env, note);
    imported += 1;
  }

  const importedAttachments = await importAttachments(env, entries, idMap);

  return json({
    data: {
      imported,
      conflicts,
      attachments: importedAttachments,
      message: FLAVOUR.importDone,
    },
  });
}

async function importAttachments(
  env: Env,
  entries: Record<string, Uint8Array>,
  idMap: Map<string, string>,
): Promise<number> {
  let count = 0;
  for (const [path, data] of Object.entries(entries)) {
    const match = /^attachments\/([^/]+)\/(.+)$/.exec(path);
    if (!match) continue;
    const [, originalNoteId, filename] = match;
    if (!originalNoteId || !filename) continue;

    const noteId = idMap.get(originalNoteId) ?? originalNoteId;
    const id = newNoteId();
    const key = `attachments/${noteId}/${id}-${filename}`;
    const contentType = contentTypeFor(filename);

    await env.BUCKET.put(key, data, { httpMetadata: { contentType } });
    await env.DB.prepare(
      `INSERT INTO attachments (id, note_id, r2_key, filename, content_type, size, created_at)
       VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)`,
    )
      .bind(id, noteId, key, filename, contentType, data.byteLength, Date.now())
      .run();
    count += 1;
  }
  return count;
}
