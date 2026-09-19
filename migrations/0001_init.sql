-- 0001_init.sql
-- Demiplane: the pocket dimension's ledger.
-- R2 holds the markdown (source of truth); D1 holds the index, sync log,
-- sessions, and one-time magic-link tokens.

CREATE TABLE notes (
  id           TEXT PRIMARY KEY,
  title        TEXT NOT NULL DEFAULT '',
  folder       TEXT,
  tags         TEXT NOT NULL DEFAULT '[]',
  r2_key       TEXT NOT NULL,
  created_at   INTEGER NOT NULL,
  updated_at   INTEGER NOT NULL,
  deleted      INTEGER NOT NULL DEFAULT 0,
  version      INTEGER NOT NULL DEFAULT 1,
  content_hash TEXT
);

CREATE INDEX idx_notes_updated ON notes(updated_at);
CREATE INDEX idx_notes_folder ON notes(folder);

-- Monotonic pull cursor. The client remembers the last `seq` it saw.
CREATE TABLE change_log (
  seq        INTEGER PRIMARY KEY AUTOINCREMENT,
  note_id    TEXT NOT NULL,
  op         TEXT NOT NULL,
  version    INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

CREATE INDEX idx_change_log_note ON change_log(note_id);

CREATE TABLE sessions (
  id         TEXT PRIMARY KEY,
  email      TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  expires_at INTEGER NOT NULL
);

CREATE INDEX idx_sessions_expires ON sessions(expires_at);

CREATE TABLE magic_tokens (
  token_hash TEXT PRIMARY KEY,
  email      TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  expires_at INTEGER NOT NULL,
  used_at    INTEGER
);

CREATE INDEX idx_magic_tokens_email ON magic_tokens(email);

CREATE TABLE attachments (
  id           TEXT PRIMARY KEY,
  note_id      TEXT NOT NULL,
  r2_key       TEXT NOT NULL,
  filename     TEXT,
  content_type TEXT,
  size         INTEGER,
  created_at   INTEGER NOT NULL
);

CREATE INDEX idx_attachments_note ON attachments(note_id);
