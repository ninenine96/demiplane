# Demiplane — UX & Visual Design

> Content first. UI second. Fantasy atmosphere third.

Demiplane is a **minimal notes app with a fantasy identity** — an Obsidian-like
writing surface with a restrained arcane skin. The chrome should dissolve around
the document. The fantasy is atmosphere and language, never extra controls.

## Core principle

If a UI element can disappear until it is needed, it disappears. If a control
can be a keyboard shortcut or a contextual action, it becomes one. If something
is decorative but does not improve hierarchy or atmosphere, it is removed.

The result should look almost plain at first glance. Then the typography, the
aged gold, the language, and the small details register: *this is a magical
archive.*

## Hierarchy of attention

1. **The page** — title and body dominate every screen.
2. **Primary actions** — new page, search, open.
3. **Progressive disclosure** — metadata, attachments, filters, backup, all
   behind a quiet menu or keyboard shortcut.
4. **Atmosphere** — colour, type, hairlines, copy.

## The editor is a single canvas

- **One page, one continuous document.** No permanent split editor/preview. No
  IDE feeling.
- Writing width is constrained to a comfortable reading measure
  (`max-w-[44rem]`, centred) with generous vertical padding.
- The surface is the raw document (markdown source), set in a readable serif —
  like inscribing a page, not filling a form.
- **The formatting toolbar is removed.** `@uiw/react-md-editor` runs with
  `hideToolbar`. Formatting is markdown syntax plus shortcuts:

  | Shortcut | Action |
  | --- | --- |
  | `Cmd/Ctrl + E` | Reveal / veil the page (preview toggle) |
  | `Cmd/Ctrl + B` | Bold the selection |
  | `Cmd/Ctrl + I` | Italicise the selection |
  | `Cmd/Ctrl + K` | Wrap the selection as a link |

- **Preview is a mode, not a pane.** The same canvas renders the sanitized
  `marked` + DOMPurify output; toggle back to edit. Never side-by-side.

## The top bar is nearly empty

Permanently: the back affordance (mobile), the page title, a tiny sync dot, and
one overflow menu. Nothing else.

The **page menu** (the `⋯`) is the progressive-disclosure surface for everything
occasional:

- Reveal / veil the page
- **Satchel** (folder)
- **Sigils** (tags)
- **Haversack** (attachments + upload)
- **Banish this page** / recover from the Void

The default page shows only a title and its content.

## The sidebar is a summonable archive

- On desktop it is a quiet 288px column that collapses completely. A slim gilded
  edge trigger on the left summons it again; `Cmd/Ctrl + \` toggles it. The
  collapsed state is remembered per device.
- On mobile it is simply the list screen; selecting a page opens the editor
  full-screen with a back chevron (master–detail).
- Contents, kept minimal: wordmark, one quiet search field (Scry), a small
  `+`, and an overflow menu. **Filters (satchel, Void) are hidden** behind the
  filter affordance. **Backup and sign-out live in the overflow menu**, not as
  permanent chrome.
- No per-note tag/folder chips in the list — title and excerpt only.

## Empty states

Extremely quiet, lots of negative space, typography carries it:

```
        This demiplane is empty.

        Inscribe a new page.

        [ + Inscribe a new page ]
```

## Status & feedback

- A single **sync dot** in the top bar. Full flavour and plain status live in its
  accessible name and tooltip; clicking opens a portal (syncs).
- Optimistic saves; never block typing on the network.
- Discrete events (grimoire copied, timeline folded in, conflict preserved)
  appear as a stacked toast, then leave.

## Visual language — modern arcane archive

A clean contemporary app with warm, archival materials. **No parchment, leather,
wood, scrolls, runes, frames, particles, smoke, or gratuitous glow.** Ornament
only where it reinforces hierarchy.

### Colour tokens

| Token | Value | Use |
| --- | --- | --- |
| void-950 | `#131110` | Warm charcoal ground |
| void-900 | `#1a1714` | Sidebar, headers |
| void-800 | `#211d19` | Cards, popovers, toasts |
| void-700 | `#2e2823` | Hairlines, dividers |
| parchment-100 | `#f1e9da` | Warm ivory text |
| parchment-500 | `#a4998a` | Secondary text, meta |
| arcane-500 | `#5f4d92` | Primary action (deep violet) |
| gold-400 | `#c3a15c` | Aged gilding: wordmark, focus, accents |
| gold-300 | `#d9c08a` | Highlights on dark surfaces |
| ember-400 | `#c76f66` | Destructive |
| sage-400 | `#86a98c` | Synced |

Gold is muted brass, never bright yellow. Gilded hairlines mark structural
dividers; focus rings and selection use the same gold at low alpha.

### Typography

| Role | Family | Notes |
| --- | --- | --- |
| UI / controls | **Inter** | Buttons, inputs, lists, meta. |
| Wordmark & labels | **Cinzel** | "Demiplane" and small uppercase labels, gilded. |
| Note title, editor, preview | **Spectral** | The manuscript surface. Preview headings use Cinzel. |
| Code | `ui-monospace` | Inline code and blocks. |

Self-hosted via `@fontsource` (offline, no CDN). Controls are never set in a
display serif.

### Signature details

- Faint gilded underline on the wordmark.
- Gilded hairlines on structural dividers only.
- 2px gilded inset rule on the active note's leading edge.
- Single gilded top hairline on the auth card.
- Lucide icons at `stroke-width: 1.6`.

## Accessibility

- Focus-visible gold rings on every interactive element.
- Menus/popovers close on Escape and outside click; triggers expose
  `aria-expanded`.
- Colour contrast ≥ 4.5:1 for body text.
- `prefers-reduced-motion` respected.
- Screen readers get literal meaning via `sr-only` plain statuses.

## Rollout

1. Foundation ✅ tokens, fonts, Lucide, master–detail shell.
2. Content-first rework ✅ single-canvas serif editor (no toolbar), nearly empty
   top bar, page menu for metadata, summonable sidebar, quiet empty states.
3. Components ⏳ Radix Dialog/Sheet/Toast/Tooltip, replace `window.confirm`.
4. Polish ⏳ command palette (`Cmd/Ctrl+K`), motion, focus mode, light theme.

New strings always go into the lexicon in `AGENTS.md`.
