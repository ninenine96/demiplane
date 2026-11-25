-- 0005_owners.sql
-- The ledger assumed one keeper: pages, trinkets and the change log belonged to
-- whoever asked. A second, unrelated address now shares the deployment, so every
-- row carries the address that owns it and the keys become per-owner.
--
-- Rows written before this migration land with an empty owner and are claimed by
-- OWNER_EMAIL the first time the Worker sees them (see src/lib/owners.ts).

-- notes: (owner, id) replaces id as the key, so one keeper's page id can never
-- collide with another's.
CREATE TABLE notes_owned (
  owner        TEXT NOT NULL,
  id           TEXT NOT NULL,
  title        TEXT NOT NULL DEFAULT '',
  folder       TEXT,
  tags         TEXT NOT NULL DEFAULT '[]',
  r2_key       TEXT NOT NULL,
  created_at   INTEGER NOT NULL,
  updated_at   INTEGER NOT NULL,
  deleted      INTEGER NOT NULL DEFAULT 0,
  version      INTEGER NOT NULL DEFAULT 1,
  content_hash TEXT,
  PRIMARY KEY (owner, id)
);

INSERT INTO notes_owned (
  owner, id, title, folder, tags, r2_key, created_at, updated_at, deleted,
  version, content_hash
)
SELECT '', id, title, folder, tags, r2_key, created_at, updated_at, deleted,
       version, content_hash
FROM notes;

DROP TABLE notes;
ALTER TABLE notes_owned RENAME TO notes;

CREATE INDEX idx_notes_updated ON notes(updated_at);
CREATE INDEX idx_notes_folder ON notes(folder);
CREATE INDEX idx_notes_owner ON notes(owner, updated_at);

-- attachments: the same treatment, so a trinket id is only meaningful to its
-- owner.
CREATE TABLE attachments_owned (
  owner        TEXT NOT NULL,
  id           TEXT NOT NULL,
  note_id      TEXT NOT NULL,
  r2_key       TEXT NOT NULL,
  filename     TEXT,
  content_type TEXT,
  size         INTEGER,
  created_at   INTEGER NOT NULL,
  PRIMARY KEY (owner, id)
);

INSERT INTO attachments_owned (
  owner, id, note_id, r2_key, filename, content_type, size, created_at
)
SELECT '', id, note_id, r2_key, filename, content_type, size, created_at
FROM attachments;

DROP TABLE attachments;
ALTER TABLE attachments_owned RENAME TO attachments;

CREATE INDEX idx_attachments_note ON attachments(note_id);
CREATE INDEX idx_attachments_owner ON attachments(owner, note_id);

-- change_log keeps its monotonic seq (the global cursor), but a pull is filtered
-- by owner so one keeper's edits never surface in another's stream.
ALTER TABLE change_log ADD COLUMN owner TEXT NOT NULL DEFAULT '';

CREATE INDEX idx_change_log_owner ON change_log(owner, seq);

-- Small place for one-shot bookkeeping, such as the legacy ownership claim.
CREATE TABLE IF NOT EXISTS meta (
  key   TEXT PRIMARY KEY,
  value TEXT NOT NULL
);
