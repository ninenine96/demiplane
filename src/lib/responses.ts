import type { ApiError } from "../../shared/types";

export function json(data: unknown, init: ResponseInit = {}): Response {
  const headers = new Headers(init.headers);
  headers.set("content-type", "application/json; charset=utf-8");
  return new Response(JSON.stringify(data), { ...init, headers });
}

/**
 * Flavourful but honest error. `message` carries the personality; `messagePlain`
 * is the unambiguous status for logs, screen readers, and clients that want the
 * truth without the flourish.
 */
export function apiError(
  status: number,
  message: string,
  messagePlain: string,
  headers?: HeadersInit,
): Response {
  const body: ApiError = { error: messagePlain, message, messagePlain };
  return json(body, { status, headers });
}

export function ok<T>(data: T, init: ResponseInit = {}): Response {
  return json({ data }, init);
}
