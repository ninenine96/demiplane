import type {
  ApiToken,
  ApiTokenCreated,
  ApiTokenInput,
} from "../../shared/types";
import { nowSeconds, randomToken, sha256Hex } from "../lib/crypto";

const TOKEN_PREFIX = "dmp_";

interface TokenRow {
  id: string;
  name: string;
  folder: string | null;
  created_at: number;
  last_used_at: number | null;
  revoked_at: number | null;
}

function rowToToken(row: TokenRow): ApiToken {
  return {
    id: row.id,
    name: row.name,
    folder: row.folder,
    createdAt: row.created_at,
    lastUsedAt: row.last_used_at,
    revokedAt: row.revoked_at,
  };
}

export async function createApiToken(
  env: Env,
  email: string,
  input: ApiTokenInput,
): Promise<ApiTokenCreated> {
  const secret = `${TOKEN_PREFIX}${randomToken(32)}`;
  const tokenHash = await sha256Hex(secret);
  const id = crypto.randomUUID();
  const now = nowSeconds();

  await env.DB.prepare(
    `INSERT INTO api_tokens (id, token_hash, name, email, folder, created_at, last_used_at, revoked_at)
     VALUES (?1, ?2, ?3, ?4, ?5, ?6, NULL, NULL)`,
  )
    .bind(id, tokenHash, input.name, email, input.folder, now)
    .run();

  return {
    id,
    name: input.name,
    folder: input.folder,
    createdAt: now,
    lastUsedAt: null,
    revokedAt: null,
    token: secret,
  };
}

export async function listApiTokens(
  env: Env,
  email: string,
): Promise<ApiToken[]> {
  const { results } = await env.DB.prepare(
    `SELECT id, name, folder, created_at, last_used_at, revoked_at
     FROM api_tokens WHERE email = ?1 ORDER BY created_at DESC`,
  )
    .bind(email)
    .all<TokenRow>();
  return (results ?? []).map(rowToToken);
}

export async function revokeApiToken(
  env: Env,
  email: string,
  id: string,
): Promise<boolean> {
  const result = await env.DB.prepare(
    `UPDATE api_tokens SET revoked_at = ?1
     WHERE id = ?2 AND email = ?3 AND revoked_at IS NULL`,
  )
    .bind(nowSeconds(), id, email)
    .run();
  return (result.meta.changes ?? 0) > 0;
}
