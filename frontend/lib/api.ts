import type {
  Attachment,
  Note,
  NoteInput,
  NoteMeta,
  SyncPullResponse,
  SyncPushItem,
  SyncPushResponse,
} from "../../shared/types";
import { FLAVOUR, PLAIN } from "../../shared/messages";

export class DemiplaneError extends Error {
  constructor(
    readonly status: number,
    message: string,
    readonly plain: string,
  ) {
    super(message);
    this.name = "DemiplaneError";
  }
}

interface ErrorBody {
  message?: string;
  messagePlain?: string;
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  let response: Response;
  try {
    response = await fetch(path, {
      credentials: "same-origin",
      ...init,
      headers: {
        "content-type": "application/json",
        ...(init.headers ?? {}),
      },
    });
  } catch {
    throw new DemiplaneError(0, FLAVOUR.syncFailed, PLAIN.syncError);
  }

  const text = await response.text();
  const body: unknown = text ? safeJson(text) : null;

  if (!response.ok) {
    const error = (body ?? {}) as ErrorBody;
    throw new DemiplaneError(
      response.status,
      error.message ?? FLAVOUR.errorGeneric,
      error.messagePlain ?? PLAIN.error,
    );
  }

  return body as T;
}

function safeJson(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

export const api = {
  async me(): Promise<{ email: string; appName: string }> {
    const body = await request<{ data: { email: string; appName: string } }>(
      "/api/me",
    );
    return body.data;
  },

  async requestMagicCode(email: string): Promise<{ devCode?: string }> {
    const body = await request<{ data: { devCode?: string } }>(
      "/api/auth/request",
      { method: "POST", body: JSON.stringify({ email }) },
    );
    return body.data;
  },

  async verifyMagicCode(
    email: string,
    code: string,
    remember: boolean,
  ): Promise<{ email: string }> {
    const body = await request<{ data: { email: string } }>(
      "/api/auth/verify",
      { method: "POST", body: JSON.stringify({ email, code, remember }) },
    );
    return body.data;
  },

  async logout(): Promise<void> {
    await request("/api/auth/logout", { method: "POST" });
  },

  async listNotes(): Promise<NoteMeta[]> {
    const body = await request<{ data: NoteMeta[] }>("/api/notes");
    return body.data;
  },

  async getNote(id: string): Promise<Note> {
    const body = await request<{ data: Note }>(`/api/notes/${id}`);
    return body.data;
  },

  async createNote(input: NoteInput): Promise<Note> {
    const body = await request<{ data: Note }>("/api/notes", {
      method: "POST",
      body: JSON.stringify(input),
    });
    return body.data;
  },

  async updateNote(id: string, input: NoteInput): Promise<Note> {
    const body = await request<{ data: Note }>(`/api/notes/${id}`, {
      method: "PUT",
      body: JSON.stringify(input),
    });
    return body.data;
  },

  async deleteNote(id: string): Promise<Note> {
    const body = await request<{ data: Note }>(`/api/notes/${id}`, {
      method: "DELETE",
    });
    return body.data;
  },

  async undeleteNote(id: string): Promise<Note> {
    const body = await request<{ data: Note }>(`/api/notes/${id}/undelete`, {
      method: "POST",
    });
    return body.data;
  },

  async syncPush(notes: SyncPushItem[]): Promise<SyncPushResponse> {
    return request<SyncPushResponse>("/api/sync/push", {
      method: "POST",
      body: JSON.stringify({ notes }),
    });
  },

  async syncPull(since: number): Promise<SyncPullResponse> {
    return request<SyncPullResponse>(`/api/sync/pull?since=${since}`);
  },

  async listAttachments(noteId: string): Promise<Attachment[]> {
    const body = await request<{ data: Attachment[] }>(
      `/api/attachments?noteId=${encodeURIComponent(noteId)}`,
    );
    return body.data;
  },

  async uploadAttachment(noteId: string, file: File): Promise<Attachment> {
    const form = new FormData();
    form.append("file", file);
    const response = await fetch(
      `/api/notes/${encodeURIComponent(noteId)}/attachments`,
      { method: "POST", credentials: "same-origin", body: form },
    );
    const text = await response.text();
    const body: unknown = text ? safeJson(text) : null;
    if (!response.ok) {
      const error = (body ?? {}) as ErrorBody;
      throw new DemiplaneError(
        response.status,
        error.message ?? FLAVOUR.attachmentFailed,
        error.messagePlain ?? PLAIN.attachmentError,
      );
    }
    return (body as { data: Attachment }).data;
  },

  async deleteAttachment(id: string): Promise<void> {
    await request(`/api/attachments/${encodeURIComponent(id)}`, {
      method: "DELETE",
    });
  },

  async exportGrimoire(): Promise<Blob> {
    const response = await fetch("/api/export", {
      credentials: "same-origin",
    });
    if (!response.ok) {
      throw new DemiplaneError(response.status, FLAVOUR.exportDone, PLAIN.error);
    }
    return response.blob();
  },

  async importGrimoire(
    file: File,
  ): Promise<{ imported: number; conflicts: number; attachments: number }> {
    const response = await fetch("/api/import", {
      method: "POST",
      credentials: "same-origin",
      body: file,
    });
    const text = await response.text();
    const body: unknown = text ? safeJson(text) : null;
    if (!response.ok) {
      const error = (body ?? {}) as ErrorBody;
      throw new DemiplaneError(
        response.status,
        error.message ?? FLAVOUR.errorGeneric,
        error.messagePlain ?? PLAIN.error,
      );
    }
    return (body as { data: { imported: number; conflicts: number; attachments: number } })
      .data;
  },
};
