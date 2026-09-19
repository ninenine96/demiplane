# Demiplane — UX & Visual Design Plan

> A wizard's desk, not a corporate dashboard.

The current UI grew fast and it shows: cramped mobile layout, inconsistent
spacing, plain controls, and a textarea/CodeMirror editor that fights the
viewport. This document is the plan to make Demiplane feel like a well-loved
pocket dimension — and to make the editor genuinely pleasant on a phone.

## Design principles

1. **Mobile is the primary device.** The phone is where notes actually happen.
   Every layout decision starts there and scales up.
2. **One clear action per surface.** On mobile, the list and the note are
   separate screens, not stacked halves.
3. **Arcane, not noisy.** The flavour lives in words, typography, colour, and
   small motion — never in clutter. Clarity outranks flavour where it matters.
4. **Fast and quiet.** No layout shift, no spinners where optimistic UI works,
   no jank from fixed pixel heights fighting the viewport.
5. **Offline is normal, not an error state.**

## Visual language — modern arcane archive

The base is still a clean, contemporary application: generous spacing, Inter for
all controls, crisp inputs, restrained borders. The atmosphere comes from
*material* choices — warm charcoal, aged gold, deep violet, warm ivory — plus
one display serif. Think a grimoire translated into a well-made modern app, not
medieval cosplay. **No parchment, leather, wood, scrolls, runes, frames,
particles, smoke, or gratuitous glow.** Ornament only where it reinforces
hierarchy.

### Colour tokens (semantic, not literal)

| Token | Value | Use |
| --- | --- | --- |
| `--bg` (void-950) | `#131110` | Warm charcoal ground |
| `--surface` (void-900) | `#1a1714` | Sidebar, headers, panels |
| `--surface-raised` (void-800) | `#211d19` | Cards, popovers, toasts |
| `--border` (void-700) | `#2e2823` | Hairlines, dividers |
| `--text` (parchment-100) | `#f1e9da` | Warm ivory |
| `--text-muted` (parchment-500) | `#a4998a` | Secondary text, meta |
| `--violet` (arcane-500) | `#5f4d92` | Primary action |
| `--gold` (gold-400) | `#c3a15c` | Aged gilding: wordmark, sigils, focus |
| `--gold-300` | `#d9c08a` | Highlights on dark surfaces |
| `--danger` (ember-400) | `#c76f66` | Banish, destructive |
| `--success` (sage-400) | `#86a98c` | Synced, remembered |

Gold is a **muted brass**, never bright yellow. Gilded hairlines
(`--gild-faint`, `rgba(195,161,92,0.16)`) mark structural dividers; focus rings
and selection use the same gold at low alpha.

### Typography

| Role | Family | Notes |
| --- | --- | --- |
| UI / controls | **Inter** (variable) | Buttons, inputs, lists, meta. The app stays legible and modern. |
| Wordmark & labels | **Cinzel** | "Demiplane" and small uppercase labels, letterspaced, gilded. |
| Note title & preview | **Spectral** | Serif for inscribing and reading a page — headings use Cinzel. |
| Code | `ui-monospace` stack | Inline code and code blocks. |

Self-hosted via `@fontsource` so they work offline and behind corporate
networks (no Google Fonts CDN, no layout flash). Load only Latin subsets.

Type scale: 11 / 12 / 13 / 15 / 16 / 18 / 20, line-height 1.55 body. Controls
are never set in a display serif.

### Signature details

- The wordmark carries a faint gilded underline (inscription rule).
- Structural dividers (sidebar header/footer, editor header) use the gilded
  hairline; content dividers stay neutral.
- The active note gets a 2px gilded inset rule on its leading edge.
- The auth card carries a single gilded top hairline.
- Icons are Lucide at `stroke-width: 1.6` for a slightly engraved feel.

### Iconography

**Lucide** (`lucide-react`) at 16–20px, `stroke-width: 1.6`, `--text-muted`
by default, `--gold` on active. Icons always pair with a text label or an
`aria-label` — never icon-only without an accessible name.

### Shape, space, motion

- Radii: 10px controls, 14px cards, 999px pills.
- Spacing scale: 4 / 8 / 12 / 16 / 20 / 24 / 32. Err on the side of roomier —
  the previous pass was cramped; default to 16–20px section padding on mobile.
- Elevation: neutral shadow (`0 16px 40px rgba(0,0,0,0.5)`), no coloured glow.
- Motion: 150–200ms `ease-out` for state changes; 250ms for drawers/toasts.
  Honor `prefers-reduced-motion: reduce` (drop transforms, keep opacity).
- No fixed/overlapping chrome on mobile: status toasts stack in one bottom
  container, the list screen has no floating button over its footer, and every
  fixed element accounts for `env(safe-area-inset-*)`.

## Component system

Adopt **Radix UI primitives** for the elements we keep hand-rolling badly —
Dialog, Dropdown, Tooltip, Toast, Sheet/Drawer. They are unstyled, accessible
(ARIA, focus trap, keyboard), and tiny. We style them with our tokens. This is
the shadcn/ui pattern: the component code lives in our repo
(`frontend/components/ui/*`), so we own it and can flavour it.

Start with what the app actually needs, not a component zoo:

| Component | Replaces | Why |
| --- | --- | --- |
| `Button` (variants: primary/ghost/danger, sizes sm/md, `icon`) | ad-hoc classes | consistent hit area ≥44px touch |
| `IconButton` | bare `<button>` glyphs | accessible names, focus ring |
| `Input`, `Textarea`, `Label` | raw inputs | unified focus/border |
| `Dialog` (Radix) | `window.confirm` for Banish | themed confirm, restores focus, works on mobile |
| `Sheet` (Radix) | — | mobile satchel/settings drawer |
| `Toast` (Radix or custom) | floating dismiss boxes | consistent status surface |
| `Chip` | satchel/sigil pills | tappable tags |
| `Tooltip` (Radix) | `title` attributes | proper disclosure on desktop |
| `Skeleton` | raw spinners | no layout shift while loading |

## Information architecture & responsive layout

### Mobile (primary)

- **Master–detail, two screens:** the satchel list fills the screen; selecting a
  page opens the editor full-screen with a back chevron. No stacked halves.
- **Top bar:** back/menu, note title, status dot. Sticky, translucent,
  safe-area padded.
- **List screen:** search at top, "Inscribe a new page" as a prominent button
  (and a FAB once ≥1 page exists), satchels/sigils as filter chips.
- **Editor screen:** title field, a **formatting toolbar** pinned above the
  keyboard, body, and a preview toggle. On mobile, editor *or* preview —
  never side by side.
- **Viewport:** use `100dvh` and `env(safe-area-inset-*)` so browser chrome and
  notches do not crop content.
- **Touch:** ≥44px targets, 8px minimum gaps, no hover-only affordances.

### Tablet / desktop

- Two-pane: sidebar (320px) + editor/preview. Preview may sit beside the editor.
- Keyboard shortcuts: `Cmd/Ctrl+K` search, `Cmd/Ctrl+Enter` toggle preview,
  `Cmd/Ctrl+N` new page, `Esc` close dialogs.

## Editor

The editor is the heart of the app and the biggest source of jank. Move from the
current bespoke CodeMirror + fixed split to a purpose-built library.

**Decision: [`@uiw/react-md-editor`](https://github.com/uiwjs/react-md-editor)
(MIT).** It ships a markdown textarea with a real formatting toolbar
(bold/italic/heading/list/quote/link/code/table), drag-and-drop and paste image
handling, and a preview mode — all mobile-friendly and actively maintained.

How we will use it:

- `preview="edit"` on mobile (editor surface + toolbar only), `preview="live"`
  side-by-side on desktop.
- Keep our **own `marked` + DOMPurify preview** for the read view so output
  stays sanitized and matches the Spectral "tome" styling; do not trust a second
  markdown pipeline for untrusted content.
- Wire the Haversack into its drop/paste pipeline so images upload and insert a
  markdown reference automatically.
- Theming via `data-color-mode="dark"` plus token overrides scoped to
  `.w-md-editor` (fonts, background, toolbar, focus ring).

Risks / alternatives: `@uiw/react-md-editor` is textarea-based (great on mobile,
less syntax-highlighted than CodeMirror). If we later want true WYSIWYG markdown,
**Milkdown** (ProseMirror) is the upgrade path; it is heavier and can normalise
markdown, so it is deferred.

## Editor polish checklist

- [ ] Formatting toolbar with correct `aria-label`s and shortcut hints.
- [ ] Preview toggle remembered per device.
- [ ] Autosave indicator: "Inscribed…" → "Committed to the demiplane."
- [ ] Word count / last-synced in a subtle footer.
- [ ] Haversack drop target with visible drop zone.
- [ ] Focus mode on desktop (hide sidebar).

## Status, sync & feedback

- A single unobtrusive **status dot + short line** in the header, with the full
  flavour text on tap/expand. Plain `aria-live` status always present.
- Optimistic saves; never block typing on the network.
- Toasts for discrete events (export copied, import folded in, conflict kept).
- Offline is a calm state, not an alarm: "You've stepped outside the ley lines."

## Accessibility

- Focus-visible rings in `--accent` on every interactive element.
- Dialogs/drawers trap focus and restore it (Radix).
- Colour contrast ≥ 4.5:1 for body text on surfaces.
- `prefers-reduced-motion` respected.
- Screen readers get literal meaning via `sr-only` plain statuses.

## Rollout phases

1. **Foundation** ✅ tokens, self-hosted fonts, Lucide, responsive
   master–detail shell, `Button`/`Input` primitives, safe-area + `dvh` fixes.
   *Revised* to be modern-first (Inter everywhere, Cinzel wordmark only) and to
   open up spacing after the first pass felt cramped.
2. **Editor** ✅ swapped to `@uiw/react-md-editor`, toolbar, preview toggle,
   drop integration, themed neutral.
3. **Components** — Radix `Dialog`/`Sheet`/`Toast`/`Tooltip`, replace
   `window.confirm`, unify loading with skeletons.
4. **Polish** — motion pass, focus mode, keyboard shortcuts, light theme.

Each phase keeps the Flavour Charter in `AGENTS.md` intact — new strings go into
the lexicon.
