# Demiplane — Agent Guide

> Your notes, in a pocket dimension.

Demiplane is a single-user, offline-first notes app. This file is the canonical
project memory for agents working in this repo. Read it before doing anything.
The full build plan lives in [`docs/PLAN.md`](docs/PLAN.md).

## What this is

- **Audience:** one person (me) across work + personal devices, including phones.
- **Promise:** take a note from anywhere with internet, never fight a corporate
  network, never pay a third-party notes subscription, never get locked in.
- **Data:** markdown files in R2 are the source of truth. D1 is a rebuildable
  index + sync/auth state. Users can export everything.

## Stack

| Layer | Choice |
| --- | --- |
| Runtime | Cloudflare Workers + Static Assets (`run_worker_first: ["/api/*"]`) |
| Build | `@cloudflare/vite-plugin` + Vite + TypeScript |
| Frontend | React + Tailwind, CodeMirror 6, `marked` + DOMPurify |
| Local store | Dexie (IndexedDB) |
| PWA | `vite-plugin-pwa` (Workbox) |
| Storage | R2 (notes + attachments), D1 (metadata/session/sync) |
| Email | Resend free tier (magic link) |
| Validation | Zod |
| Tests | Vitest (`*.test.ts` beside source) |

## Commands

```bash
npm run dev        # Vite + Wrangler local dev (local D1 + R2)
npm run build      # type-check + production build
npm run deploy     # build + wrangler deploy
npm test           # vitest
npm run typecheck  # tsc --noEmit
npm run lint       # eslint
npm run db:migrate:local   # apply D1 migrations to the local database
npm run db:migrate:remote  # apply D1 migrations to the deployed database
```

Local dev needs the migrations applied once (`npm run db:migrate:local`). With
`AUTH_DEV_MODE=true` in `.dev.vars`, the magic link is logged and returned as
`devLink`, so you can sign in without email.

Local secrets go in `.dev.vars` (gitignored). Deployed secrets via
`wrangler secret put`. Never commit secrets.

## Layout

```
src/          Worker: router, auth middleware, api/*, db/*, lib/*
frontend/     React SPA: components, db (dexie), sync engine, lib
migrations/   D1 SQL migrations (numbered, append-only)
docs/PLAN.md  living build plan
```

## Flavour Charter — HARD REQUIREMENT

Demiplane has a personality: a well-travelled adventurer's pocket dimension,
equal parts arcane and practical. **Every user-facing string carries the
flavour.** No bare `Error`, `Loading...`, or `Save` ever ships.

### Voice

- Second person, present tense. Talk *to* the user, never at them.
- Arcane but warm. Clever, not twee. Never a wall of lore where a label belongs.
- Clarity always outranks flavour when something is risky or broken:
  destructive actions, auth failures, and data loss must be unmistakably clear
  *underneath* the flourish. Flavour is the garnish, never the meal.

### Canonical lexicon

| Moment | String |
| --- | --- |
| Empty notes list | This demiplane is empty. |
| New note | Inscribe a new page. |
| Save (local, pending sync) | Inscribed. Will reach the demiplane when the portal opens. |
| Save (synced) | Committed to the demiplane. |
| Sync in progress | Opening a portal... |
| Sync failed | The portal flickered — retrying. |
| Offline | You've stepped outside the ley lines. Changes are safe here until the portal returns. |
| Magic link sent | A sending stone is on its way — check your inbox. |
| Login confirmed | The portal recognises you. |
| Logout | You slip back through the portal. |
| Delete confirm | Banish this page? |
| Delete done | Sent to the Void. |
| Undelete | Recover from the Void. |
| Search placeholder | Scry the archives... |
| No search results | The archives hold nothing by that name. |
| Export | Copy your grimoire. |
| Import | Restore from a fallen timeline. |
| Conflict (both kept) | Two timelines converged — both versions preserved. |
| Attachment upload | Tucking it into the Haversack... |
| 404 | This page has drifted into the Astral Plane. |
| Unauthorized | The portal does not recognise you. |
| Empty folder | Nothing inscribed here yet. |

Extend this table as new moments appear; keep it in one place so the voice
stays consistent. If a string needs to be plain for safety, add it here with a
note explaining why.

### Rules

1. Every new UI string must appear in the lexicon (or extend it in the same PR).
2. Loading/error states keep a plain status line beneath the flavour where it
   helps (e.g. an `aria-live` region that says the literal status).
3. Accessibility first: flavour text still needs correct `role`/`aria-label`.
   Screen readers get the meaning, not just the joke.
4. No emoji unless explicitly requested.
5. A reviewer (agent or human) who finds a bare status string rewrites it.

## Conventions

- TypeScript everywhere; no `any` without a comment justifying it.
- Zod-validate every request body at the Worker boundary.
- R2 keys: `notes/{id}.md`, `attachments/{noteId}/{attachmentId}-{filename}`.
- Deletes are soft (tombstone in D1); R2 objects move to `trash/`.
- Sync uses a monotonic `change_log.seq` cursor — never client clocks.
- Sessions: hashed tokens only, in D1; HttpOnly + Secure + SameSite=Lax cookie.
- Magic-link tokens: hashed, single-use, 10-minute TTL.
- Magic links must be confirmed by a button POST, never auto-consumed on GET
  (corporate mail scanners follow links).
- Commit messages: imperative, concise, no secrets.
