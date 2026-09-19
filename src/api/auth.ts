import { FLAVOUR, PLAIN } from "../../shared/messages";
import { nowSeconds, randomToken, sha256Hex } from "../lib/crypto";
import { sendMagicLink } from "../lib/email";
import { apiError, ok } from "../lib/responses";
import {
  clearedSessionCookie,
  createSession,
  revokeSession,
  sessionCookie,
} from "../lib/session";
import { authRequestSchema } from "../lib/validation";

const MAGIC_LINK_TTL_SECONDS = 10 * 60;
const MAX_REQUESTS_PER_WINDOW = 5;
const RATE_WINDOW_SECONDS = 15 * 60;

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

function isSecureRequest(url: URL): boolean {
  return url.protocol === "https:";
}

/** Step 1: the keeper asks for a sending stone. */
export async function handleAuthRequest(
  request: Request,
  env: Env,
  url: URL,
): Promise<Response> {
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
  // probe who owns this demiplane. In dev mode we happily issue a stone to any
  // address so local testing never dead-ends on configuration.
  if (!owner || email !== owner) {
    if (!devMode) {
      return ok({ sent: true, message: FLAVOUR.magicLinkSent });
    }
    console.warn(
      `[Demiplane] dev mode: "${email}" is not OWNER_EMAIL ("${owner || "unset"}"). ` +
        `Issuing a sending stone anyway — set OWNER_EMAIL in .dev.vars to silence this.`,
    );
  }

  const now = nowSeconds();
  const recent = await env.DB.prepare(
    "SELECT COUNT(*) AS count FROM magic_tokens WHERE email = ?1 AND created_at > ?2",
  )
    .bind(email, now - RATE_WINDOW_SECONDS)
    .first<{ count: number }>();

  if ((recent?.count ?? 0) >= MAX_REQUESTS_PER_WINDOW) {
    return apiError(
      429,
      FLAVOUR.authRateLimited,
      "Too many magic link requests. Try again later.",
    );
  }

  const token = randomToken(32);
  const tokenHash = await sha256Hex(token);

  await env.DB.prepare(
    "INSERT INTO magic_tokens (token_hash, email, created_at, expires_at, used_at) VALUES (?1, ?2, ?3, ?4, NULL)",
  )
    .bind(tokenHash, email, now, now + MAGIC_LINK_TTL_SECONDS)
    .run();

  const link = `${url.origin}/?login=${encodeURIComponent(token)}`;
  const result = await sendMagicLink(env, email, link);

  return ok({
    sent: true,
    message: FLAVOUR.magicLinkSent,
    // Only ever surface the link when dev mode is explicitly enabled.
    devLink: devMode ? result.devLink : undefined,
  });
}

/** Step 2: the keeper presses the button to seal the portal. */
export async function handleAuthVerify(
  request: Request,
  env: Env,
  url: URL,
): Promise<Response> {
  const body: unknown = await request.json().catch(() => null);
  const token =
    body && typeof body === "object" && "token" in body
      ? (body as { token?: unknown }).token
      : null;

  if (typeof token !== "string" || token.length < 16) {
    return apiError(
      400,
      FLAVOUR.invalidSendingStone,
      "Invalid or missing magic link token.",
    );
  }

  const tokenHash = await sha256Hex(token);
  const row = await env.DB.prepare(
    "SELECT email, expires_at, used_at FROM magic_tokens WHERE token_hash = ?1",
  )
    .bind(tokenHash)
    .first<{ email: string; expires_at: number; used_at: number | null }>();

  if (!row || row.used_at !== null || row.expires_at <= nowSeconds()) {
    return apiError(
      401,
      FLAVOUR.invalidSendingStone,
      "Magic link is invalid, already used, or expired.",
    );
  }

  await env.DB.prepare(
    "UPDATE magic_tokens SET used_at = ?1 WHERE token_hash = ?2",
  )
    .bind(nowSeconds(), tokenHash)
    .run();

  const session = await createSession(env, row.email);
  const headers = new Headers();
  headers.append(
    "set-cookie",
    sessionCookie(session.token, isSecureRequest(url)),
  );

  return ok(
    { email: row.email, message: FLAVOUR.loginConfirmed },
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
  });
}
