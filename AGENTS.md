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
| Frontend | React + Tailwind, `@uiw/react-md-editor`, `marked` + DOMPurify |
| Fonts | Cinzel (display), Inter (UI), Spectral (prose) via `@fontsource` |
| Icons | `lucide-react` |
| Local store | Dexie (IndexedDB) |
| Search | MiniSearch (client-side, offline) |
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
bash scripts/provision.sh  # create deployed D1 + R2, wire database_id, migrate
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
shared/       Types + flavour lexicon shared by Worker and frontend
migrations/   D1 SQL migrations (numbered, append-only)
scripts/      provision.sh (D1 + R2 setup, remote migrations)
docs/PLAN.md  living build plan + deployment log + risks
README.md     public-facing overview
```

## Status

Built and deployed (see the deployment log in `docs/PLAN.md`):

- Magic-link auth, hashed sessions, dev-mode `devLink`
- Notes as markdown in R2, D1 index + `change_log` cursor, conflict copies
- Offline-first Dexie store + background sync, installable PWA
- CodeMirror editor, preview, satchel/sigil, search, Void (soft delete)
- Attachments (Haversack) and zip export/import (grimoire)
- 14-day remembered sessions with sliding renewal
- Content-first UX: single-canvas serif editor with no toolbar, a nearly empty
  top bar, metadata behind a page menu, and a summonable sidebar — see
  [`docs/UX.md`](docs/UX.md). Shortcuts (`?` opens the Grimoire of keys):
  `Cmd/Ctrl+E` preview, `B`/`I`/`K` format, `\` toggle sidebar, `N` new page.
  Right-click opens context menus for pages and the canvas.

Deployed at https://demiplane.prohan.workers.dev on the `prohan` workers.dev
subdomain. Secrets (`OWNER_EMAIL`, `SESSION_SECRET`, `RESEND_API_KEY`) are set
via `wrangler secret put`; `AUTH_DEV_MODE` is `"false"` in production so the API
never returns a magic link in a response.

Known follow-ups: D1 FTS as a server-side search fallback, a custom domain,
and broader test coverage. Offline attachment caching and `preview_urls: false`
are already in place.


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
| Magic link sent | A sending stone is on its way — it bears a sigil. |
| Login code prompt | Enter the sigil inscribed on the sending stone. |
| Invalid code | That sigil is not recognised. Read the stone again. |
| Too many wrong codes | Too many wrong sigils. Request a fresh sending stone. |
| Shortcuts dialog | Grimoire of keys |
| Login confirmed | The portal recognises you. |
| Logout | You slip back through the portal. |
| Delete confirm | Banish this page? |
| Delete done | Sent to the Void. |
| Undelete | Recover from the Void. |
| Search placeholder | Scry the archives... |
| No search results | The archives hold nothing by that name. |
| UI scale label | Enlarge / Reduce |
| Enlarge the UI | Enlarge the archive |
| Reduce the UI | Reduce the archive |
| Reset the UI scale | Return to true sight |
| Export | Copy your grimoire. |
| Import | Restore from a fallen timeline. |
| Conflict (both kept) | Two timelines converged — both versions preserved. |
| Attachment upload | Tucking it into the Haversack... |
| 404 | This page has drifted into the Astral Plane. |
| Unauthorized | The portal does not recognise you. |
| Empty folder | Nothing inscribed here yet. |
| Empty Void (trash) | The Void is empty. For now. |
| Unnamed note | An untitled page |
| Login prompt | Speak the keeper's email to unseal the portal. |
| Confirm login | Seal the portal |
| Remember this location | Remember this location for a fortnight. |
| Show preview | Reveal the page |
| Hide preview | Veil the page |
| Back to list (mobile) | Back to the archives |
| Session expired | The portal has forgotten you. Ask for a new sending stone. |
| Invalid sending stone | That sending stone has crumbled to dust. Request another. |
| Rate limited | The stones need a moment to cool. Try again shortly. |
| Attachment done | Safely in the Haversack. |
| Attachment failed | The Haversack resisted. Try again. |
| Export done | Your grimoire is copied. Keep it somewhere safe. |
| Import confirm | Restoring will merge another grimoire into this demiplane. |
| Import done | The fallen timeline has been folded in. |
| Generic error | A wild surge in the weave. Nothing was lost — try again. |

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
  A remembered location lasts 14 days and slides forward on activity; unchecking
  "remember" yields a browser-session cookie instead.
- Login is a hashed, single-use **six-digit code** (a "sigil"), 10-minute TTL,
  emailed via Resend. Verify is rate-limited per email and locks out after 10
  failed attempts in 15 minutes. No link is ever followed, so mail scanners
  cannot consume it.
- Attachments: 15 MB cap, content-type allowlist, served through the Worker
  with `Cache-Control: private, immutable`; never public R2 URLs.
- Search is client-side over Dexie so it works offline. Ranked full-text via
  MiniSearch (`frontend/lib/search.ts`); D1 FTS remains a future server fallback.
- Export builds a store-only zip (`fflate`, level 0) to stay well under the
  Worker CPU budget; import never overwrites — colliding ids become conflict
  copies.
- Deployment: `scripts/provision.sh` for D1 + R2; secrets via `wrangler secret
  put`; see the deployment log in `docs/PLAN.md`.
- Commit messages: imperative, concise, no secrets.
