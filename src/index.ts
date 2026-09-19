import { FLAVOUR } from "../shared/messages";
import type { ZodType } from "zod";
import {
  handleAuthLogout,
  handleAuthRequest,
  handleAuthVerify,
  handleMe,
} from "./api/auth";
import {
  createNote,
  getNoteById,
  listNotes,
  softDeleteNote,
  undeleteNote,
  updateNote,
} from "./api/notes";
import {
  handleAttachmentDelete,
  handleAttachmentGet,
  handleAttachmentList,
  handleAttachmentUpload,
} from "./api/attachments";
import { handleExport, handleImport } from "./api/export";
import { handleSyncPull, handleSyncPush } from "./api/sync";
import { apiError, ok } from "./lib/responses";
import { readSession } from "./lib/session";
import { noteInputSchema, syncPushSchema } from "./lib/validation";

const NOTE_PATH = /^\/api\/notes\/([A-Za-z0-9-]+)$/;
const NOTE_UNDELETE_PATH = /^\/api\/notes\/([A-Za-z0-9-]+)\/undelete$/;
const NOTE_ATTACHMENTS_PATH = /^\/api\/notes\/([A-Za-z0-9-]+)\/attachments$/;
const ATTACHMENT_PATH = /^\/api\/attachments\/([A-Za-z0-9-]+)$/;

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    if (!url.pathname.startsWith("/api/")) {
      return env.ASSETS.fetch(request);
    }

    try {
      return await handleApi(request, env, url);
    } catch (error) {
      console.error("[Demiplane] the weave tore", error);
      return apiError(
        500,
        FLAVOUR.errorGeneric,
        "Internal server error.",
      );
    }
  },
} satisfies ExportedHandler<Env>;

async function handleApi(
  request: Request,
  env: Env,
  url: URL,
): Promise<Response> {
  const { pathname } = url;
  const method = request.method;

  // --- Public (no session required) --------------------------------------
  if (pathname === "/api/auth/request" && method === "POST") {
    return handleAuthRequest(request, env, url);
  }
  if (pathname === "/api/auth/verify" && method === "POST") {
    return handleAuthVerify(request, env, url);
  }
  if (pathname === "/api/auth/logout" && method === "POST") {
    return handleAuthLogout(request, env, url);
  }
  if (pathname === "/api/health" && method === "GET") {
    return ok({ status: "The demiplane hums quietly.", time: Date.now() });
  }

  // --- Everything below needs a valid session ----------------------------
  const session = await readSession(env, request);
  if (!session) {
    return apiError(401, FLAVOUR.unauthorized, "Unauthorized.");
  }

  if (pathname === "/api/me" && method === "GET") {
    return handleMe(session.email, env);
  }

  if (pathname === "/api/notes") {
    if (method === "GET") {
      return ok(await listNotes(env));
    }
    if (method === "POST") {
      const parsed = await parseBody(request, noteInputSchema);
      if (!parsed.ok) return parsed.response;
      return ok(await createNote(env, parsed.data), { status: 201 });
    }
  }

  const noteMatch = NOTE_PATH.exec(pathname);
  if (noteMatch) {
    const id = noteMatch[1];
    if (!id) return apiError(404, FLAVOUR.notFound, "Not found.");

    if (method === "GET") {
      const note = await getNoteById(env, id);
      return note
        ? ok(note)
        : apiError(404, FLAVOUR.notFound, "Note not found.");
    }
    if (method === "PUT") {
      const parsed = await parseBody(request, noteInputSchema);
      if (!parsed.ok) return parsed.response;
      const note = await updateNote(env, id, parsed.data);
      return note
        ? ok(note)
        : apiError(404, FLAVOUR.notFound, "Note not found.");
    }
    if (method === "DELETE") {
      const note = await softDeleteNote(env, id);
      return note
        ? ok(note)
        : apiError(404, FLAVOUR.notFound, "Note not found.");
    }
  }

  const undeleteMatch = NOTE_UNDELETE_PATH.exec(pathname);
  if (undeleteMatch && method === "POST") {
    const id = undeleteMatch[1];
    if (!id) return apiError(404, FLAVOUR.notFound, "Not found.");
    const note = await undeleteNote(env, id);
    return note
      ? ok(note)
      : apiError(404, FLAVOUR.emptyTrash, "Note not found in the Void.");
  }

  const attachmentsMatch = NOTE_ATTACHMENTS_PATH.exec(pathname);
  if (attachmentsMatch) {
    const noteId = attachmentsMatch[1];
    if (!noteId) return apiError(404, FLAVOUR.notFound, "Not found.");
    if (method === "POST") return handleAttachmentUpload(request, env, noteId);
  }

  if (pathname === "/api/attachments" && method === "GET") {
    const noteId = url.searchParams.get("noteId");
    if (!noteId) {
      return apiError(400, FLAVOUR.notFound, "Missing noteId query parameter.");
    }
    return handleAttachmentList(env, noteId);
  }

  const attachmentMatch = ATTACHMENT_PATH.exec(pathname);
  if (attachmentMatch) {
    const id = attachmentMatch[1];
    if (!id) return apiError(404, FLAVOUR.notFound, "Not found.");
    if (method === "GET") return handleAttachmentGet(env, id);
    if (method === "DELETE") return handleAttachmentDelete(env, id);
  }

  if (pathname === "/api/export" && method === "GET") {
    return handleExport(env);
  }
  if (pathname === "/api/import" && method === "POST") {
    return handleImport(request, env);
  }

  if (pathname === "/api/sync/pull" && method === "GET") {
    const since = Number(url.searchParams.get("since") ?? "0");
    return handleSyncPull(env, Number.isFinite(since) && since > 0 ? since : 0);
  }
  if (pathname === "/api/sync/push" && method === "POST") {
    const parsed = await parseBody(request, syncPushSchema);
    if (!parsed.ok) return parsed.response;
    return handleSyncPush(env, parsed.data.notes);
  }

  return apiError(404, FLAVOUR.notFound, "API route not found.");
}

type ParseResult<T> =
  | { ok: true; data: T }
  | { ok: false; response: Response };

async function parseBody<T>(
  request: Request,
  schema: ZodType<T>,
): Promise<ParseResult<T>> {
  const body: unknown = await request.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return {
      ok: false,
      response: apiError(
        400,
        "That offering was not shaped correctly. Check the fields and try again.",
        "Invalid request body.",
      ),
    };
  }
  return { ok: true, data: parsed.data };
}
