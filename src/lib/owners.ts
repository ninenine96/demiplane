/**
 * Ownership of the ledger.
 *
 * The demiplane used to answer to exactly one keeper. It now admits a short
 * allowlist of addresses, and every page, trinket and change-log row carries the
 * address that owns it. `session.email` is the only source of that address —
 * never a value from a request body.
 */

/** One-shot bookkeeping key: set once the pre-ownership rows have been claimed. */
const LEGACY_CLAIM_KEY = "owner_backfill_v1";

/**
 * Once a deployment has resolved the claim there is no reason to ask again
 * within the same isolate. A false negative only costs one extra query.
 */
let legacyClaimSettled = false;

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

/** The keeper named by OWNER_EMAIL, or "" when the deployment is unconfigured. */
export function primaryOwner(env: Env): string {
  return env.OWNER_EMAIL ? normalizeEmail(env.OWNER_EMAIL) : "";
}

/**
 * Every address allowed to sign in: the keeper plus `ALLOWED_EMAILS` (a
 * comma-separated list). Order is stable and duplicates collapse.
 */
export function allowedEmails(env: Env): string[] {
  const listed = (env.ALLOWED_EMAILS ?? "")
    .split(",")
    .map(normalizeEmail)
    .filter((entry) => entry.length > 0);

  const keeper = primaryOwner(env);
  const allowed = keeper ? [keeper] : [];
  for (const entry of listed) {
    if (!allowed.includes(entry)) allowed.push(entry);
  }
  return allowed;
}

export function isAllowedEmail(env: Env, email: string): boolean {
  return allowedEmails(env).includes(normalizeEmail(email));
}

/**
 * Claims the rows written before ownership existed for the keeper. Runs at most
 * once per deployment; the meta row makes it idempotent even if two isolates
 * race. Until it has run, a second keeper simply sees nothing from the legacy
 * rows, so an unfinished claim can never expose them to the wrong address.
 */
export async function settleLegacyOwnership(env: Env): Promise<void> {
  if (legacyClaimSettled) return;
  const keeper = primaryOwner(env);
  if (!keeper) return;

  const claimed = await env.DB.prepare("SELECT value FROM meta WHERE key = ?1")
    .bind(LEGACY_CLAIM_KEY)
    .first<{ value: string }>();
  if (claimed) {
    legacyClaimSettled = true;
    return;
  }

  await env.DB.batch([
    env.DB.prepare("UPDATE notes SET owner = ?1 WHERE owner = ''").bind(keeper),
    env.DB.prepare("UPDATE attachments SET owner = ?1 WHERE owner = ''").bind(
      keeper,
    ),
    env.DB.prepare("UPDATE change_log SET owner = ?1 WHERE owner = ''").bind(
      keeper,
    ),
    env.DB.prepare("INSERT OR IGNORE INTO meta (key, value) VALUES (?1, ?2)").bind(
      LEGACY_CLAIM_KEY,
      keeper,
    ),
  ]);

  legacyClaimSettled = true;
}
