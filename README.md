# Demiplane

> Your notes, in a pocket dimension.

A single-user, offline-first notes app that lives on Cloudflare's free tier.
Markdown files in R2 are the source of truth; D1 is a rebuildable index plus
auth/sync state. Take a note from any device with internet, never fight a
corporate network, never pay for someone else's notes service, never get locked
in.

**Live:** https://demiplane.prohan.workers.dev

![Demiplane: a page open in the single-canvas editor, the floating selection toolbar over a highlighted line, wikilinks in the body, and the word-count and reading-time line at the foot](docs/assets/demiplane-ui.png)

## Features

- **Passwordless magic-link sign-in** — self-hosted on your own origin, so no
  third-party auth domain to get blocked. Scanner-safe confirm step, and a
  "remember this location for a fortnight" session that slides forward as you use
  it.
- **A CodeMirror 6 markdown canvas with live preview** — autocomplete (`/`,
  `[[`, `#`), a floating selection toolbar, wikilinks with backlinks, callouts,
  and a sanitized preview via `marked` + DOMPurify.
- **A wizard's study, not a dashboard** — Cinzel/Inter/Spectral typography,
  Lucide icons, mobile-first master–detail layout. See
  [`docs/UX.md`](docs/UX.md).
- **Satchels & sigils** (folders & tags) plus instant search.
- **Offline-first** — notes live in IndexedDB (Dexie); edits sync when a
  connection returns. Conflicts keep both versions. Installable PWA.
- **The Haversack** — image/file attachments stored in R2, streamed
  authenticated.
- **Copy your grimoire** — export everything as a portable zip of markdown +
  attachments, and restore it back.
- **Personality** — every user-facing string carries the flavour. See the
  Flavour Charter in [`AGENTS.md`](AGENTS.md).

## Stack

| Layer | Choice |
| --- | --- |
| Runtime | Cloudflare Workers + Static Assets (`run_worker_first: ["/api/*"]`) |
| Build | `@cloudflare/vite-plugin` + Vite + TypeScript |
| Frontend | React + Tailwind, CodeMirror 6, `marked` + DOMPurify |
| Fonts | Cinzel (display), Inter (UI), Spectral (prose) via `@fontsource` |
| Icons | `lucide-react` |
| Local store | Dexie (IndexedDB) |
| Search | MiniSearch (client-side, offline) |
| PWA | `vite-plugin-pwa` (Workbox) |
| Storage | R2 (notes + attachments), D1 (metadata/sessions/sync) |
| Email | Resend (magic link) |
| Validation | Zod |
| Tests | Vitest |

## Quick start (local)

Requires Node 20+ (built against Node 26).

```bash
npm install
cp .dev.vars.example .dev.vars   # then edit OWNER_EMAIL
npm run db:migrate:local         # apply D1 migrations to the local database
npm run dev                      # http://localhost:5173
```

With `AUTH_DEV_MODE=true` (the default in the example file) the magic link is
logged to the console and returned as `devLink` in the response, so you can sign
in without configuring email. Open the link, then press **Seal the portal**.

## Commands

```bash
npm run dev                # Vite + Wrangler local dev (local D1 + R2)
npm run build              # type-check + production build
npm run deploy             # build + wrangler deploy
npm test                   # Vitest
npm run typecheck          # tsc --noEmit
npm run db:migrate:local   # apply D1 migrations locally
npm run db:migrate:remote  # apply D1 migrations to the deployed database
```

## Deploy

```bash
npx wrangler login                # browser OAuth
bash scripts/provision.sh         # create D1 + R2, wire database_id, migrate

npx wrangler secret put OWNER_EMAIL       # the one email allowed to sign in
npx wrangler secret put SESSION_SECRET    # openssl rand -base64 32
npx wrangler secret put RESEND_API_KEY    # https://resend.com/api-keys

npm run deploy
```

R2 requires a one-time subscription checkout (a card on file) even though usage
inside the free tier is $0. Full walkthrough and account requirements live in
[`docs/PLAN.md`](docs/PLAN.md).

## Architecture

```
 Browser / installed PWA (React SPA)
 ├─ IndexedDB (Dexie)  ← offline source of truth
 └─ Service Worker (Workbox)
            │  HTTPS /api/*
            ▼
 Cloudflare Worker
 ├─ Static assets, /api/auth, /api/notes, /api/sync,
 │  /api/attachments, /api/export, /api/import
        │                    │
        ▼                    ▼
   R2 (markdown truth)    D1 (index, sessions, sync log)
```

- **R2 keys:** `notes/{id}.md`, `attachments/{noteId}/{attachmentId}-{filename}`,
  `trash/notes/{id}.md`. Notes carry YAML frontmatter so exports are
  self-describing.
- **Sync:** monotonic `change_log.seq` cursor — never client clocks. Stale
  writers produce a conflict copy instead of losing data.
- **Auth:** hashed single-use magic-link tokens (10 min), hashed session tokens
  in D1, `HttpOnly; Secure; SameSite=Lax` cookie.

## Project layout

```
src/          Worker: router, api/*, lib/* (crypto, session, email, frontmatter)
frontend/     React SPA: components, db (Dexie), sync engine, lib
shared/       Types + the flavour lexicon (single source of both)
migrations/   D1 SQL migrations (numbered, append-only)
scripts/      provision.sh — D1 + R2 setup and remote migrations
docs/PLAN.md  Living build plan, deployment log, and risks
AGENTS.md     Agent guide + Flavour Charter (hard requirement)
```

## Cost

Everything fits the free tiers (Workers 100k req/day, D1 5M reads + 100k writes
/day + 5 GB, R2 10 GB + 1M/10M ops, Resend 100 emails/day). Realistically
**$0/month**.
