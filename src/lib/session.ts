import { nowSeconds, randomToken, sha256Hex } from "./crypto";

const COOKIE_NAME = "demiplane_session";
const SESSION_TTL_SECONDS = 90 * 24 * 60 * 60;

export interface ActiveSession {
  email: string;
  expiresAt: number;
}

export async function createSession(
  env: Env,
  email: string,
): Promise<{ token: string; expiresAt: number }> {
  const token = randomToken(32);
  const tokenHash = await sha256Hex(token);
  const now = nowSeconds();
  const expiresAt = now + SESSION_TTL_SECONDS;

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
  const row = await env.DB.prepare(
    "SELECT email, expires_at FROM sessions WHERE id = ?1 AND expires_at > ?2",
  )
    .bind(tokenHash, nowSeconds())
    .first<{ email: string; expires_at: number }>();

  if (!row) return null;
  return { email: row.email, expiresAt: row.expires_at };
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

export function sessionCookie(
  token: string,
  secure: boolean,
  maxAge = SESSION_TTL_SECONDS,
): string {
  return [
    `${COOKIE_NAME}=${token}`,
    "Path=/",
    "HttpOnly",
    "SameSite=Lax",
    `Max-Age=${maxAge}`,
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
