-- 0003_api_tokens.sql
-- Personal access tokens ("keys to the demiplane") so agents and command-line
-- tools can reach the API without a browser session. Only the SHA-256 hash of a
-- key is ever stored; the plaintext is shown once at creation. `folder` is an
-- optional default satchel applied to notes written with the key.

CREATE TABLE api_tokens (
  id           TEXT PRIMARY KEY,
  token_hash   TEXT NOT NULL UNIQUE,
  name         TEXT NOT NULL,
  email        TEXT NOT NULL,
  folder       TEXT,
  created_at   INTEGER NOT NULL,
  last_used_at INTEGER,
  revoked_at   INTEGER
);

CREATE INDEX idx_api_tokens_email ON api_tokens(email);
