import { FLAVOUR } from "../../shared/messages";
import { nowSeconds, randomCode, sha256Hex } from "../lib/crypto";
import { sendLoginCode } from "../lib/email";
import { isAllowedEmail, normalizeEmail, primaryOwner } from "../lib/owners";
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
const MAX_PER_IP_PER_WINDOW = 3;
const RATE_WINDOW_SECONDS = 15 * 60;
const MIN_REQUEST_INTERVAL_SECONDS = 30;
const MAX_VERIFY_ATTEMPTS = 10;
const ATTEMPT_WINDOW_SECONDS = 15 * 60;
const CODE_DIGITS = 6;

function codeHash(email: string, code: string): Promise<string> {
  return sha256Hex(`${email}:${code}`);
}

/**
 * The address the stone should find. The allowlist is the gate, so the shape of
 * the address itself is not validated: a malformed one simply matches nobody.
 */
async function readAddress(
  request: Request,
): Promise<{ email: string; code: string; remember: boolean } | null> {
  const body: unknown = await request.json().catch(() => null);
  const parsed = authVerifySchema.safeParse(body);
  if (!parsed.success) return null;
  return {
    email: normalizeEmail(parsed.data.email),
    code: parsed.data.code,
    remember: parsed.data.remember,
  };
}

/** Step 1: the keeper asks for a sending stone bearing a sigil. */
export async function handleAuthRequest(
  request: Request,
  env: Env,
  url: URL,
): Promise<Response> {
  void url;
  const devMode = env.AUTH_DEV_MODE === "true";
  if (!primaryOwner(env)) {
    return apiError(
      500,
      "The demiplane has no keeper's address.",
      "OWNER_EMAIL is not configured.",
    );
  }

  const body: unknown = await request.json().catch(() => null);
  const parsed = authRequestSchema.safeParse(body);
  if (!parsed.success) {
    return apiError(
      400,
      FLAVOUR.loginAddressNeeded,
      "An email address is required.",
    );
  }
  const email = normalizeEmail(parsed.data.email);

  // An address this demiplane does not know gets the same answer as one it does:
  // nobody learns which addresses are welcome here, and no stone is sent.
  if (!isAllowedEmail(env, email)) {
    return ok({ sent: true, message: FLAVOUR.codeSent });
  }

  const now = nowSeconds();
  const ip = request.headers.get("cf-connecting-ip") ?? "local";
  const ipHash = await sha256Hex(`${email}:${ip}`);

  const global = await env.DB.prepare(
    `SELECT COUNT(*) AS count, COALESCE(MAX(created_at), 0) AS last
     FROM login_codes WHERE email = ?1 AND created_at > ?2`,
  )
    .bind(email, now - RATE_WINDOW_SECONDS)
    .first<{ count: number; last: number }>();

  if ((global?.count ?? 0) >= MAX_REQUESTS_PER_WINDOW) {
    return apiError(
      429,
      FLAVOUR.authRateLimited,
      "Too many login code requests.",
      { "retry-after": "900" },
    );
  }
  if (now - (global?.last ?? 0) < MIN_REQUEST_INTERVAL_SECONDS) {
    return apiError(
      429,
      "One stone is already on its way. Give it a moment.",
      "Login code requested too recently.",
      { "retry-after": String(MIN_REQUEST_INTERVAL_SECONDS) },
    );
  }

  const perIp = await env.DB.prepare(
    `SELECT COUNT(*) AS count FROM login_codes
     WHERE email = ?1 AND ip_hash = ?2 AND created_at > ?3`,
  )
    .bind(email, ipHash, now - RATE_WINDOW_SECONDS)
    .first<{ count: number }>();

  if ((perIp?.count ?? 0) >= MAX_PER_IP_PER_WINDOW) {
    return apiError(
      429,
      FLAVOUR.authRateLimited,
      "Too many login code requests from this address.",
      { "retry-after": "900" },
    );
  }

  const code = randomCode(CODE_DIGITS);
  const hash = await codeHash(email, code);

  await env.DB.batch([
    env.DB.prepare(
      `INSERT INTO login_codes (
         token_hash, email, created_at, expires_at, used_at, ip_hash
       ) VALUES (?1, ?2, ?3, ?4, NULL, ?5)`,
    ).bind(hash, email, now, now + CODE_TTL_SECONDS, ipHash),
    env.DB.prepare(
      "DELETE FROM login_codes WHERE created_at <= ?1",
    ).bind(now - 24 * 60 * 60),
  ]);

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
  const address = await readAddress(request);
  if (!address) {
    return apiError(
      400,
      FLAVOUR.codeInvalid,
      "An email address and a six-digit code are required.",
    );
  }
  const { email, remember } = address;
  if (!isAllowedEmail(env, email)) {
    // The same answer as a wrong sigil, so the allowlist stays invisible.
    return apiError(401, FLAVOUR.codeInvalid, "Invalid or expired code.");
  }

  const now = nowSeconds();

  if (await isLocked(env, email, now)) {
    return apiError(429, FLAVOUR.codeLocked, "Too many failed attempts.");
  }

  const hash = await codeHash(email, address.code);
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
    {
      email,
      primary: email === primaryOwner(env),
      remembered: remember,
      message: FLAVOUR.loginConfirmed,
    },
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
  return ok({
    email,
    appName: env.APP_NAME ?? "Demiplane",
    primary: email === primaryOwner(env),
  });
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
