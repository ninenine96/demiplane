import { indentLess, indentMore } from "@codemirror/commands";
import { EditorSelection } from "@codemirror/state";
import type { EditorView, KeyBinding } from "@codemirror/view";

function done(view: EditorView): boolean {

  view.focus();
  return true;
}

/**
 * Wraps or unwraps the selection in a pair of markers. Handles an empty
 * selection by dropping the pair and placing the caret between them.
 */
export function wrapSelection(
  view: EditorView,
  before: string,
  after: string,
): boolean {
  const { state } = view;
  view.dispatch(
    state.changeByRange((range) => {
      const selected = state.sliceDoc(range.from, range.to);
      const outerBefore = state.sliceDoc(
        Math.max(0, range.from - before.length),
        range.from,
      );
      const outerAfter = state.sliceDoc(
        range.to,
        Math.min(state.doc.length, range.to + after.length),
      );
      if (outerBefore === before && outerAfter === after) {
        return {
          changes: [
            { from: range.from - before.length, to: range.from },
            { from: range.to, to: range.to + after.length },
          ],
          range: EditorSelection.range(
            range.from - before.length,
            range.to - before.length,
          ),
        };
      }
      return {
        changes: {
          from: range.from,
          to: range.to,
          insert: before + selected + after,
        },
        range: EditorSelection.range(
          range.from + before.length,
          range.to + before.length,
        ),
      };
    }),
  );
  return done(view);
}

export const formatBold = (view: EditorView) =>
  wrapSelection(view, "**", "**");
export const formatItalic = (view: EditorView) => wrapSelection(view, "*", "*");
export const formatStrike = (view: EditorView) =>
  wrapSelection(view, "~~", "~~");
export const formatHighlight = (view: EditorView) =>
  wrapSelection(view, "==", "==");
export const formatInlineCode = (view: EditorView) =>
  wrapSelection(view, "`", "`");

/** Forges a link, leaving the placeholder target selected for quick typing. */
export function formatLink(view: EditorView): boolean {
  const { state } = view;
  const range = state.selection.main;
  const selected = state.sliceDoc(range.from, range.to);
  const insert = `[${selected}](url)`;
  const urlFrom = range.from + selected.length + 3;
  view.dispatch({
    changes: { from: range.from, to: range.to, insert },
    selection: EditorSelection.range(urlFrom, urlFrom + 3),
  });
  return done(view);
}

/** Raises the current line to a heading, replacing any existing one. */
export function setHeading(view: EditorView, level: number): boolean {
  const { state } = view;
  const line = state.doc.lineAt(state.selection.main.from);
  const existing = /^(#{1,6})\s+/.exec(line.text);
  const prefix = `${"#".repeat(level)} `;
  const content = existing ? line.text.slice(existing[0].length) : line.text;
  view.dispatch({
    changes: { from: line.from, to: line.to, insert: prefix + content },
    selection: EditorSelection.cursor(line.from + prefix.length),
  });
  return done(view);
}

/** Adds or strips a prefix (`> `, `- `, `- [ ] `) on every selected line. */
export function toggleLinePrefix(view: EditorView, prefix: string): boolean {
  const { state } = view;
  const changes: Array<{ from: number; to?: number; insert?: string }> = [];
  const seen = new Set<number>();
  for (const range of state.selection.ranges) {
    const start = state.doc.lineAt(range.from).number;
    const end = state.doc.lineAt(range.to).number;
    for (let n = start; n <= end; n += 1) {
      if (seen.has(n)) continue;
      seen.add(n);
      const line = state.doc.line(n);
      changes.push(
        line.text.startsWith(prefix)
          ? { from: line.from, to: line.from + prefix.length }
          : { from: line.from, insert: prefix },
      );
    }
  }
  if (changes.length === 0) return false;
  view.dispatch({ changes });
  return done(view);
}

export const formatQuote = (view: EditorView) => toggleLinePrefix(view, "> ");
export const formatBulletList = (view: EditorView) =>
  toggleLinePrefix(view, "- ");
export const formatTask = (view: EditorView) =>
  toggleLinePrefix(view, "- [ ] ");

/** Tab indents a list item, or tucks two spaces in ordinary prose. */
function insertIndent(view: EditorView): boolean {
  const { state } = view;
  const line = state.doc.lineAt(state.selection.main.from);
  if (/^\s*([-*+]|\d+\.)\s/.test(line.text)) return indentMore(view);
  view.dispatch(state.replaceSelection("  "));
  return done(view);
}

/** While writing, the canvas wins over the archive's global shortcuts. */
export const markdownFormatKeymap: readonly KeyBinding[] = [
  { key: "Mod-b", run: formatBold, preventDefault: true },
  { key: "Mod-i", run: formatItalic, preventDefault: true },
  { key: "Mod-k", run: formatLink, preventDefault: true },
  { key: "Mod-Shift-x", run: formatStrike, preventDefault: true },
  { key: "Mod-Shift-h", run: formatHighlight, preventDefault: true },
  { key: "Tab", run: insertIndent, preventDefault: true },
  { key: "Shift-Tab", run: indentLess, preventDefault: true },
];
