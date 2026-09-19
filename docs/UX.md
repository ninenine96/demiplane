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

- On desktop it is a quiet column (288px by default) that **drags wider or
  narrower** — grab the handle on its right edge (220–460px) — and collapses
  completely. A slim gilded edge trigger on the left summons it again.
  `Cmd/Ctrl+B` (or `Cmd/Ctrl+\`) toggles it. Width and collapsed state are
  remembered per device.
- On mobile it is simply the list screen; selecting a page opens the editor
  full-screen with a back chevron (master–detail).
- Contents, kept minimal: wordmark, one quiet search field (Scry), a small
  `+`, and an overflow menu. **Filters (satchel, Void) are hidden** behind the
  filter affordance. **Backup and sign-out live in the overflow menu**, not as
  permanent chrome.
- No per-note tag/folder chips in the list — title and excerpt only.

## Enlarge / Reduce (UI scale)

The whole interface scales from one control in the sidebar footer: a **slider**
flanked by `ZoomOut` / `ZoomIn` glyphs, with the current percentage and an
explicit **reset button** (*Return to true sight*) on the label row. The label
is **Enlarge / Reduce**, the transmutation spell, not "scale".

It sets `--ui-scale` on the root, which feeds `html { font-size }`; every
dimension is written in `rem`, so spacing, type and the editor scale together.
Range 85–135% in 5% steps, remembered per device.

## Motion

A little arcana, never in the way of writing. All of it collapses to nothing
under `prefers-reduced-motion`.

- **The gilding sheen** — a slow gold highlight sweeps across the DEMIPLANE
  wordmark every nine seconds (`@supports` background-clip guard, solid gold
  fallback).
- **The scrying portal** — the empty editor shows a faint animated sigil: a
  pulsing arcane core between two counter-rotating rings. Atmosphere for the
  one moment there is no content.
- **Pages materialise** — switching notes cross-fades and lifts the canvas
  (`animate-page-in`), so a page feels drawn rather than swapped.
- **Panes open and close** — menus and popovers pop in *and* out (kept mounted
  through a short exit); the archive pane animates its width shut on desktop
  rather than vanishing; below `lg` the list and canvas slide in from opposite
  edges as master→detail.
- **The archive slides in** — the sidebar enters with a short horizontal ease.
- **The list settles** — note rows stagger in with a small delay.
- **Opening a portal** — while syncing, the sync dot becomes a spinning gold
  ring instead of a pulse.
- **Toasts rise and sink** — status messages lift in with a soft overshoot and
  fade down on dismiss.
- **Arcane bloom** — primary buttons gain a faint violet glow on hover and
  press in slightly on click.
- **Attachments appear** — new Haversack chips ease in.

Keep motion to entrances, exits and state changes. Never animate the text being
typed.


## Editor alignment

MDEditor layers an invisible `<textarea>` exactly over a highlighted `<pre>`.
If the two have any different metric the caret drifts from the glyphs.
`frontend/index.css` therefore forces the **same** family, size, line-height,
letter-spacing, word-spacing, ligatures, kerning, tab-size, text-indent and
padding on both layers, and sets `--md-editor-font-family` to Spectral. Keep
these rules together when editing the editor theme.

## Context menus & keys

Right-click (and long-press where it maps to `contextmenu`) is a first-class
surface, not an afterthought:

- **On a page row** — Open, Banish / Recover.
- **On the canvas** — Reveal / Veil the page, Tuck into the Haversack,
  Banish / Recover.

Menus are cursor-positioned, clamped to the viewport, and close on outside
click, Escape, scroll, resize, or another right-click.

Every action is also reachable from the keyboard. `?` (or `Cmd/Ctrl+/`) opens
the **Grimoire of keys**, generated from a single registry in
`frontend/lib/shortcuts.ts` so the help can never drift from the bindings.

| Key | Action |
| --- | --- |
| `Cmd/Ctrl+B` | Summon or fold the archive (fold a word in bold while writing) |
| `Cmd/Ctrl+\` | Summon or fold the archive (alternate) |
| `Cmd/Ctrl+N` | Inscribe a new page |
| `Cmd/Ctrl+K` | Scry the archives (find; forges a link while writing) |
| `Cmd/Ctrl+E` | Reveal or veil the page |
| `Cmd/Ctrl+B` / `I` | Bold / italic the selection (while writing) |
| `Cmd/Ctrl+K` | Forge a link from the selection (while writing) |
| `?` | Grimoire of keys |
| `Esc` | Close a menu, or return to the archive (mobile) |

`Cmd/Ctrl+B` and `Cmd/Ctrl+K` are contextual, exactly like an editor: the
writing surface wins when focused, otherwise the archive action fires.

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

**One family throughout: Inter.** UI, note titles, the editor, and the preview
all use it, so the app reads as a single consistent surface. The only exception
is the wordmark.

| Role | Family | Notes |
| --- | --- | --- |
| Everything | **Inter** (variable) | Controls, titles, editor, preview. |
| Wordmark only | **Cinzel** | Just "Demiplane" — the one deliberate exception. |
| Code | `ui-monospace` | Inline code and code blocks. |

Self-hosted via `@fontsource` (offline, no CDN). Everything scales from
`--ui-scale`.

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
