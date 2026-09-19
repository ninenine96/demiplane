import { FLAVOUR } from "../../shared/messages";
import { nowSeconds, randomCode, sha256Hex } from "../lib/crypto";
import { sendLoginCode } from "../lib/email";
import { apiError, ok } from "../lib/responses";
import {
  clearedSessionCookie,
  createSession,
  isSecureRequest,
  revokeSession,
  sessionCookie,
  SESSION_TTL_SECONDS,
  SHORT_SESSION_TTL_SECONDS,
} from "../lib/session";
import { authRequestSchema, authVerifySchema } from "../lib/validation";

const CODE_TTL_SECONDS = 10 * 60;
const MAX_REQUESTS_PER_WINDOW = 5;
const RATE_WINDOW_SECONDS = 15 * 60;
const MAX_VERIFY_ATTEMPTS = 10;
const ATTEMPT_WINDOW_SECONDS = 15 * 60;
const CODE_DIGITS = 6;

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

function codeHash(email: string, code: string): Promise<string> {
  return sha256Hex(`${email}:${code}`);
}

/** Step 1: the keeper asks for a sending stone bearing a sigil. */
export async function handleAuthRequest(
  request: Request,
  env: Env,
  url: URL,
): Promise<Response> {
  void url;
  const body: unknown = await request.json().catch(() => null);
  const parsed = authRequestSchema.safeParse(body);
  if (!parsed.success) {
    return apiError(
      400,
      "That is not a shape the stones recognise. Give a proper email address.",
      "Invalid email address.",
    );
  }

  const devMode = env.AUTH_DEV_MODE === "true";
  const email = normalizeEmail(parsed.data.email);
  const owner = env.OWNER_EMAIL ? normalizeEmail(env.OWNER_EMAIL) : "";

  // In production we always report success so the endpoint cannot be used to
  // probe who owns this demiplane. In dev mode any address works.
  if (!owner || email !== owner) {
    if (!devMode) {
      return ok({ sent: true, message: FLAVOUR.codeSent });
    }
    console.warn(
      `[Demiplane] dev mode: "${email}" is not OWNER_EMAIL ("${owner || "unset"}"). ` +
        `Issuing a stone anyway — set OWNER_EMAIL in .dev.vars to silence this.`,
    );
  }

  const now = nowSeconds();
  const recent = await env.DB.prepare(
    "SELECT COUNT(*) AS count FROM login_codes WHERE email = ?1 AND created_at > ?2",
  )
    .bind(email, now - RATE_WINDOW_SECONDS)
    .first<{ count: number }>();

  if ((recent?.count ?? 0) >= MAX_REQUESTS_PER_WINDOW) {
    return apiError(
      429,
      FLAVOUR.authRateLimited,
      "Too many login code requests. Try again later.",
    );
  }

  const code = randomCode(CODE_DIGITS);
  const hash = await codeHash(email, code);

  await env.DB.prepare(
    "INSERT INTO login_codes (token_hash, email, created_at, expires_at, used_at) VALUES (?1, ?2, ?3, ?4, NULL)",
  )
    .bind(hash, email, now, now + CODE_TTL_SECONDS)
    .run();

  const result = await sendLoginCode(env, email, code);

  return ok({
    sent: true,
    message: FLAVOUR.codeSent,
    // Only ever surface the code when dev mode is explicitly enabled.
    devCode: devMode ? result.devCode : undefined,
  });
}

/** Step 2: the keeper enters the sigil to unseal the portal. */
export async function handleAuthVerify(
  request: Request,
  env: Env,
  url: URL,
): Promise<Response> {
  const body: unknown = await request.json().catch(() => null);
  const parsed = authVerifySchema.safeParse(body);
  if (!parsed.success) {
    return apiError(
      400,
      FLAVOUR.codeInvalid,
      "A six-digit code and email are required.",
    );
  }

  const email = normalizeEmail(parsed.data.email);
  const remember = parsed.data.remember;
  const now = nowSeconds();

  if (await isLocked(env, email, now)) {
    return apiError(429, FLAVOUR.codeLocked, "Too many failed attempts.");
  }

  const hash = await codeHash(email, parsed.data.code);
  const row = await env.DB.prepare(
    "SELECT email, expires_at, used_at FROM login_codes WHERE token_hash = ?1",
  )
    .bind(hash)
    .first<{ email: string; expires_at: number; used_at: number | null }>();

  const valid =
    row !== null &&
    normalizeEmail(row.email) === email &&
    row.used_at === null &&
    row.expires_at > now;

  if (!valid) {
    const locked = await registerFailedAttempt(env, email, now);
    return apiError(
      locked ? 429 : 401,
      locked ? FLAVOUR.codeLocked : FLAVOUR.codeInvalid,
      locked ? "Too many failed attempts." : "Invalid or expired code.",
    );
  }

  await env.DB.batch([
    env.DB.prepare(
      "UPDATE login_codes SET used_at = ?1 WHERE email = ?2 AND used_at IS NULL",
    ).bind(now, email),
    env.DB.prepare("DELETE FROM login_attempts WHERE email = ?1").bind(email),
  ]);

  const session = await createSession(
    env,
    email,
    remember ? SESSION_TTL_SECONDS : SHORT_SESSION_TTL_SECONDS,
  );
  const headers = new Headers();
  headers.append(
    "set-cookie",
    sessionCookie(
      session.token,
      isSecureRequest(url),
      remember ? SESSION_TTL_SECONDS : null,
    ),
  );

  return ok(
    { email, remembered: remember, message: FLAVOUR.loginConfirmed },
    { headers },
  );
}

export async function handleAuthLogout(
  request: Request,
  env: Env,
  url: URL,
): Promise<Response> {
  await revokeSession(env, request);
  const headers = new Headers();
  headers.append("set-cookie", clearedSessionCookie(isSecureRequest(url)));
  return ok({ message: FLAVOUR.logout }, { headers });
}

export function handleMe(email: string, env: Env): Response {
  return ok({ email, appName: env.APP_NAME ?? "Demiplane" });
}

async function isLocked(
  env: Env,
  email: string,
  now: number,
): Promise<boolean> {
  const row = await env.DB.prepare(
    "SELECT window_start, count FROM login_attempts WHERE email = ?1",
  )
    .bind(email)
    .first<{ window_start: number; count: number }>();
  return (
    row !== null &&
    now - row.window_start < ATTEMPT_WINDOW_SECONDS &&
    row.count >= MAX_VERIFY_ATTEMPTS
  );
}

async function registerFailedAttempt(
  env: Env,
  email: string,
  now: number,
): Promise<boolean> {
  const row = await env.DB.prepare(
    "SELECT window_start, count FROM login_attempts WHERE email = ?1",
  )
    .bind(email)
    .first<{ window_start: number; count: number }>();

  if (!row || now - row.window_start >= ATTEMPT_WINDOW_SECONDS) {
    await env.DB.prepare(
      `INSERT INTO login_attempts (email, window_start, count) VALUES (?1, ?2, 1)
       ON CONFLICT(email) DO UPDATE SET window_start = excluded.window_start, count = 1`,
    )
      .bind(email, now)
      .run();
    return false;
  }

  const count = row.count + 1;
  await env.DB.prepare(
    "UPDATE login_attempts SET count = ?1 WHERE email = ?2",
  )
    .bind(count, email)
    .run();
  return count >= MAX_VERIFY_ATTEMPTS;
}
