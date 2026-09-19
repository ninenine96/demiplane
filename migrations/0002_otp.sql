-- 0002_otp.sql
-- Magic links become one-time codes (sigils). The old table is renamed and a
-- small per-email attempt ledger is added so a six-digit code cannot be
-- brute-forced.

ALTER TABLE magic_tokens RENAME TO login_codes;
DROP INDEX IF EXISTS idx_magic_tokens_email;
CREATE INDEX idx_login_codes_email ON login_codes(email);

CREATE TABLE login_attempts (
  email        TEXT PRIMARY KEY,
  window_start INTEGER NOT NULL,
  count        INTEGER NOT NULL
);
