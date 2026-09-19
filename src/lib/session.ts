import { nowSeconds, randomToken, sha256Hex } from "./crypto";

const COOKIE_NAME = "demiplane_session";

/** A remembered location stays sealed for a fortnight. */
export const SESSION_TTL_SECONDS = 14 * 24 * 60 * 60;
/** A fleeting visit (remember unchecked) lasts a single working day. */
export const SHORT_SESSION_TTL_SECONDS = 24 * 60 * 60;
/** Renew once less than this remains, so active keepers never get logged out. */
const RENEW_THRESHOLD_SECONDS = 7 * 24 * 60 * 60;

export interface ActiveSession {
  email: string;
  expiresAt: number;
  /** Raw session token, needed to refresh the cookie on renewal. */
  token: string;
  /** True when the expiry was just slid forward and the cookie must update. */
  renew: boolean;
}

export function isSecureRequest(url: URL): boolean {
  return url.protocol === "https:";
}

export async function createSession(
  env: Env,
  email: string,
  ttlSeconds: number = SESSION_TTL_SECONDS,
): Promise<{ token: string; expiresAt: number }> {
  const token = randomToken(32);
  const tokenHash = await sha256Hex(token);
  const now = nowSeconds();
  const expiresAt = now + ttlSeconds;

  await env.DB.prepare(
    "INSERT INTO sessions (id, email, created_at, expires_at) VALUES (?1, ?2, ?3, ?4)",
  )
    .bind(tokenHash, email, now, expiresAt)
    .run();

  return { token, expiresAt };
}

export async function readSession(
  env: Env,
  request: Request,
): Promise<ActiveSession | null> {
  const token = readCookie(request, COOKIE_NAME);
  if (!token) return null;

  const tokenHash = await sha256Hex(token);
  const now = nowSeconds();
  const row = await env.DB.prepare(
    "SELECT email, expires_at FROM sessions WHERE id = ?1 AND expires_at > ?2",
  )
    .bind(tokenHash, now)
    .first<{ email: string; expires_at: number }>();

  if (!row) return null;

  // Slide the expiry forward for an active keeper so a remembered location
  // does not quietly forget them mid-project.
  let expiresAt = row.expires_at;
  let renew = false;
  if (expiresAt - now < RENEW_THRESHOLD_SECONDS) {
    expiresAt = now + SESSION_TTL_SECONDS;
    await env.DB.prepare(
      "UPDATE sessions SET expires_at = ?1 WHERE id = ?2",
    )
      .bind(expiresAt, tokenHash)
      .run();
    renew = true;
  }

  return { email: row.email, expiresAt, token, renew };
}

export async function revokeSession(
  env: Env,
  request: Request,
): Promise<void> {
  const token = readCookie(request, COOKIE_NAME);
  if (!token) return;
  const tokenHash = await sha256Hex(token);
  await env.DB.prepare("DELETE FROM sessions WHERE id = ?1").bind(tokenHash).run();
}

export async function purgeExpiredSessions(env: Env): Promise<void> {
  await env.DB.prepare("DELETE FROM sessions WHERE expires_at <= ?1")
    .bind(nowSeconds())
    .run();
}

/**
 * `maxAge === null` produces a session cookie that dies with the browser —
 * the "do not remember this location" case.
 */
export function sessionCookie(
  token: string,
  secure: boolean,
  maxAge: number | null = SESSION_TTL_SECONDS,
): string {
  return [
    `${COOKIE_NAME}=${token}`,
    "Path=/",
    "HttpOnly",
    "SameSite=Lax",
    maxAge === null ? "" : `Max-Age=${maxAge}`,
    secure ? "Secure" : "",
  ]
    .filter(Boolean)
    .join("; ");
}

export function clearedSessionCookie(secure: boolean): string {
  return sessionCookie("", secure, 0);
}

function readCookie(request: Request, name: string): string | null {
  const header = request.headers.get("cookie");
  if (!header) return null;
  for (const part of header.split(";")) {
    const separator = part.indexOf("=");
    if (separator === -1) continue;
    if (part.slice(0, separator).trim() === name) {
      return decodeURIComponent(part.slice(separator + 1).trim());
    }
  }
  return null;
}
