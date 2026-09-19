# Demiplane — Build Plan

> Your notes, in a pocket dimension.

A single-user, offline-first notes app on Cloudflare's free tier. Markdown files
in R2 are the source of truth; D1 is a rebuildable index plus auth/sync state.
This document is the living plan — update it as decisions change.

See [`../AGENTS.md`](../AGENTS.md) for the Flavour Charter (every user-facing
string carries the flavour) and repo conventions.

## Goals

- Take a note from **any device with internet** (work laptop, personal machine,
  phone) without fighting corporate networks.
- **Never** pay a third-party notes subscription and **never** get locked in.
- Work **offline**, sync when a connection returns.
- Export everything at any time.

## Non-goals

- Multi-user / sharing.
- Real-time collaborative editing.
- Rich WYSIWYG (markdown source + preview is the editing model).

## Architecture

```
 Browser / installed PWA (React SPA)
 ├─ IndexedDB (Dexie)  ← local source for offline reads/writes
 └─ Service Worker (Workbox) precaches app shell
            │  HTTPS /api/*
            ▼
 Cloudflare Worker (single deploy)
 ├─ Static assets      → built React app
 ├─ /api/auth/*        → magic-link login, session cookies
 ├─ /api/notes/*       → CRUD
 ├─ /api/sync/*        → push/pull delta sync
 ├─ /api/attachments/* → uploads/downloads
 └─ /api/export|import → backup/restore
        │                    │
        ▼                    ▼
   R2 (source of truth)    D1 (index, sessions, sync log)
   notes/{id}.md           notes, change_log, sessions,
   attachments/...         magic_tokens, attachments
```

**Design principle:** R2 holds portable `.md` files (no lock-in), D1 is a
rebuildable index + sync/auth state. You can always pull your markdown out.

## Storage layout

R2 keys (flat; title lives in frontmatter so renames are free):

- `notes/{id}.md` — markdown with YAML frontmatter (`id`, `title`, `tags`,
  `folder`, `created`, `updated`)
- `attachments/{noteId}/{attachmentId}-{filename}`
- `trash/{originalKey}` — soft-deleted objects awaiting purge

### D1 schema (see `migrations/`)

```sql
CREATE TABLE notes (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL DEFAULT '',
  folder TEXT,
  tags TEXT NOT NULL DEFAULT '[]',
  r2_key TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  deleted INTEGER NOT NULL DEFAULT 0,
  version INTEGER NOT NULL DEFAULT 1,
  content_hash TEXT
);
CREATE INDEX idx_notes_updated ON notes(updated_at);

CREATE TABLE change_log (            -- reliable pull cursor (no clock skew)
  seq INTEGER PRIMARY KEY AUTOINCREMENT,
  note_id TEXT NOT NULL,
  op TEXT NOT NULL,                  -- upsert | delete
  version INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

CREATE TABLE sessions (
  id TEXT PRIMARY KEY,               -- hash of session token
  email TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  expires_at INTEGER NOT NULL
);

CREATE TABLE magic_tokens (
  token_hash TEXT PRIMARY KEY,
  email TEXT NOT NULL,
  expires_at INTEGER NOT NULL,
  used_at INTEGER
);

CREATE TABLE attachments (
  id TEXT PRIMARY KEY,
  note_id TEXT NOT NULL,
  r2_key TEXT NOT NULL,
  filename TEXT,
  content_type TEXT,
  size INTEGER,
  created_at INTEGER NOT NULL
);
```

Optional later: D1 FTS5 table for server-side search (D1 supports the FTS5
module). Client-side search over Dexie is the core because it works offline.

## Auth — self-hosted magic link

All traffic stays on the app's own origin, so corporate firewalls that block
unrelated domains do not break login.

1. `POST /api/auth/request` with email. Reject unless it matches the single
   allowed `OWNER_EMAIL`. Generate a 32-byte token, store only its SHA-256 hash
   in `magic_tokens` (10-minute TTL, single-use), email the link via Resend.
2. **Scanner-safe:** the emailed link opens `/?login=<token>`, which renders a
   **Confirm** button that POSTs to `/api/auth/verify`. Corporate mail scanners
   that auto-GET links cannot consume the token.
3. `POST /api/auth/verify` validates + marks used, creates a session row, sets
   `Set-Cookie: demiplane_session=<token>; HttpOnly; Secure; SameSite=Lax;
   Path=/; Max-Age=7776000` (90 days, sliding).
4. Middleware validates the session on every `/api/*` call.
   `POST /api/auth/logout` revokes it.
5. Rate-limit auth requests (D1 counter keyed by IP/email).

Local dev: with `AUTH_DEV_MODE=true`, the magic link is logged to the Worker
console instead of emailed.

Resend note: without a custom domain, the shared `onboarding@resend.dev` sender
can only email the account-owner address. That is acceptable for a single-user
app; a verified domain is a trivial later upgrade.

## Sync (offline-first, single user)

Local Dexie `notes` rows carry `{...fields, dirty, deleted, baseVersion, lastSeq}`.

- **Push:** `POST /api/sync/push` — a batch of dirty notes with `baseVersion`.
  Server assigns a new monotonic `version`, writes R2 + D1 + `change_log`,
  returns new versions.
- **Conflict (two offline devices):** if `baseVersion < serverVersion`, keep
  both. The incoming note is stored as a new note titled
  `"Title (conflict YYYY-MM-DD HH:MM)"`. No data loss.
- **Pull:** `GET /api/sync/pull?since=<seq>` joins `change_log → notes` for
  `seq > cursor`, including tombstones. Client applies and advances `lastSeq`.
- **Triggers:** `online` event, tab focus / visibility change, interval, and a
  manual "Open a portal" (sync now) button. iOS has no Background Sync, so
  focus-triggered sync is the reliable path.
- Deletes are soft (tombstone in D1); R2 objects move to `trash/` then purge.

## API surface

```
POST   /api/auth/request        POST /api/auth/verify      POST /api/auth/logout
GET    /api/me

GET    /api/notes               GET  /api/notes/:id
PUT    /api/notes/:id           DELETE /api/notes/:id        POST /api/notes/:id/undelete

GET    /api/sync/pull?since=    POST /api/sync/push

POST   /api/attachments/:noteId GET  /api/attachments/:id    DELETE /api/attachments/:id

GET    /api/export              POST /api/import
```

## Frontend

- Layout: sidebar (folders + tags + note list) / editor / live preview toggle.
- CodeMirror 6 markdown editor, debounced autosave to Dexie, background sync.
- Installable PWA (manifest + icons, `display: standalone`).
- Search: client-side index (FlexSearch / MiniSearch) over Dexie — instant and
  works offline.
- Attachments: upload via Worker → R2; images render through authenticated
  `/api/attachments/:id`; blobs cached for offline.
- Settings: sync status / last-synced, export/import, logout.
- All strings follow the Flavour Charter in `AGENTS.md`.

## Free tier budget

| Service | Free allowance | Expected use |
| --- | --- | --- |
| Workers | 100k requests/day | trivial |
| D1 | 5M rows read + 100k written/day, 5 GB | trivial |
| R2 | 10 GB storage, 1M Class A / 10M Class B ops | trivial |
| Resend | 100 emails/day, 3000/mo | ~a few logins/day |

Realistically **$0/month**. A custom domain later is ~$10/yr and a config change.

## Risks & mitigations

- **`*.workers.dev` blocked/mistrusted by some corporate networks** — origin is
  kept configurable so a custom domain can be added later with minimal change.
- **Email scanners consuming magic links** — confirm-button POST flow.
- **iOS PWA storage eviction / no Background Sync** — sync on focus, prominent
  manual sync, one-tap export/import backups.
- **Resend test-sender limitation** — fine for single user; verify a domain to
  lift it.

## Deployment log

- **Worker:** `demiplane` → https://demiplane.prohan.workers.dev
- **Account:** `mohammadruhaan@gmail.com` (`2674d66f7c5ae8ddcb9efdd23ddc6d5b`)
- **workers.dev subdomain:** `prohan`
- **D1:** `demiplane-db` (`2106e302-90ee-4527-a588-df6cb54fdd45`), migration 0001 applied
- **R2:** `demiplane-files`
- **Secrets set:** `SESSION_SECRET`, `OWNER_EMAIL`. **TODO:** `RESEND_API_KEY`.
- **Production vars:** `AUTH_DEV_MODE="false"` (so no devLink is ever returned).

### Note: brief `*.workers.dev` TLS failures after first setup

Immediately after registering the `prohan` subdomain, TLS handshakes to
`demiplane.prohan.workers.dev` failed with `alert 40` from both this machine and
the local network, while other Cloudflare hosts worked. This was transient
propagation for the newly created workers.dev subdomain and resolved on its own
within minutes. Verified live: `/api/health` 200, `/` 200 HTML, `/api/me` 401.

If it ever recurs on a restrictive network, attach a custom domain
(dashboard → Worker → Settings → Domains & Routes → Add custom domain, or a
`routes` entry with `custom_domain: true`), which sidesteps `workers.dev` SNI
filtering entirely.

## Milestones

1. **Scaffold** — package/config files, Worker entry, D1 + R2 bindings,
   migrations, `AGENTS.md` + this plan. ✅ done
2. **Auth** — magic link + sessions, dev-mode logging, then Resend. ✅ done
3. **Notes CRUD** — API + R2/D1 persistence, frontmatter read/write. ✅ done
4. **UI** — note list, CodeMirror editor, preview, folders/tags. ✅ done
5. **Offline + sync** — Dexie store, sync engine, PWA install, flavour states.
   ✅ done (delta sync + conflict copies + autosave)
6. **Attachments** — upload/download, offline cache. ✅ done (upload via Worker → R2,
   authenticated streaming, type/size limits, delete; offline caching still TODO)
7. **Search + backup** — client-side ranked search (MiniSearch over Dexie) and
   zip export/import. ✅ done
8. **Deploy** — provision, secrets, deploy, cross-device smoke test.
   ✅ deployed at https://demiplane.prohan.workers.dev; phone smoke test pending
9. **Optional** — custom domain, conflict-copy UX, D1 FTS, test coverage. ⏳
10. **UX overhaul** — see [`UX.md`](UX.md). Phases 1–2 done (design tokens,
    self-hosted fonts, Lucide, responsive master–detail shell,
    `@uiw/react-md-editor`). Next: Radix Dialog/Sheet/Toast, motion, focus mode.

### Local development notes

- Apply local migrations once (and after adding new ones):
  `npm run db:migrate:local`.
- `.dev.vars` drives local config. With `AUTH_DEV_MODE=true` the magic link is
  printed to the Worker console AND returned as `devLink` in the JSON response,
  so you can sign in without email. Tap the link, then press **Seal the portal**.
- With no `RESEND_API_KEY` set, the app silently falls back to dev mode.


## Provisioning / deploy reference

### What you need

1. **Cloudflare account** (free, no card) — https://dash.cloudflare.com/sign-up
2. **R2 enabled** — the one step that needs a payment method on file. Go to
   **Storage & databases → R2 → Overview** and complete the checkout. Usage
   inside the free tier stays $0; a card is required to activate R2.
   *No-card alternative:* store note bodies in D1 instead of R2 (design change).
3. **Resend account** (free, no card) — https://resend.com. Without a verified
   domain the shared `onboarding@resend.dev` sender can only email the Resend
   account's own address, which is fine for a single-user app.
4. **Wrangler login** — `npx wrangler login` (browser OAuth).
5. **A `*.workers.dev` subdomain** — free, chosen on first deploy.

### Steps

```bash
npx wrangler login                      # browser OAuth
bash scripts/provision.sh               # D1 + R2 + database_id + remote migrate

npx wrangler secret put OWNER_EMAIL     # the only email allowed to sign in
npx wrangler secret put SESSION_SECRET  # openssl rand -base64 32
npx wrangler secret put RESEND_API_KEY  # https://resend.com/api-keys

npm run deploy                          # build + wrangler deploy
```

`AUTH_DEV_MODE` must remain `false` in `wrangler.jsonc` for production (it is).
That guarantees the API never returns a magic link in the response.

### Local `.dev.vars` (gitignored)

```
AUTH_DEV_MODE=true
OWNER_EMAIL=you@example.com
SESSION_SECRET=dev-only-secret
RESEND_API_KEY=
```
