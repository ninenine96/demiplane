import { indentLess, indentMore } from "@codemirror/commands";
import { EditorSelection } from "@codemirror/state";
import type { EditorView, KeyBinding } from "@codemirror/view";
import { toggleTaskMarker } from "../checklist";

function done(view: EditorView): boolean {
  view.focus();
  return true;
}

/** Drops text at the caret, replacing any selection, and keeps the quill. */
export function insertText(view: EditorView, text: string): boolean {
  view.dispatch(view.state.replaceSelection(text));
  return done(view);
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

/**
 * Ticks or unticks every line the selection touches. A plain list gains a
 * checkbox; ordinary prose becomes a fresh task. Obsidian's reflex.
 */
export function formatTask(view: EditorView): boolean {
  const { state } = view;
  const changes: Array<{ from: number; to: number; insert: string }> = [];
  const seen = new Set<number>();
  for (const range of state.selection.ranges) {
    const start = state.doc.lineAt(range.from).number;
    const end = state.doc.lineAt(range.to).number;
    for (let n = start; n <= end; n += 1) {
      if (seen.has(n)) continue;
      seen.add(n);
      const line = state.doc.line(n);
      const toggled = toggleTaskMarker(line.text);
      if (toggled !== null) {
        changes.push({ from: line.from, to: line.to, insert: toggled });
        continue;
      }
      const list = /^\s*(?:[-*+]|\d+[.)])\s+/.exec(line.text);
      const body = list ? line.text.slice(list[0].length) : line.text;
      const marker = list ? list[0] : "- ";
      changes.push({
        from: line.from,
        to: line.to,
        insert: `${marker}[ ] ${body}`,
      });
    }
  }
  if (changes.length === 0) return false;
  view.dispatch({ changes });
  return done(view);
}

const TASK_CONTINUE = /^(\s*(?:[-*+]|\d+[.)])\s+)\[([ xX])\]\s*(.*)$/;
const BULLET_CONTINUE = /^(\s*)([-*+])\s+(.*)$/;
const NUMBER_CONTINUE = /^(\s*)(\d+)[.)]\s+(.*)$/;

/**
 * `Enter` inside a list carries the list on, as a checklist carries its boxes.
 * An empty item simply clears its marker so writing can leave the list. This
 * returns `false` everywhere else, letting the default newline through.
 */
export function continueList(view: EditorView): boolean {
  const { state } = view;
  const range = state.selection.main;
  if (!range.empty) return false;
  const line = state.doc.lineAt(range.from);
  if (range.from !== line.to) return false;

  const task = TASK_CONTINUE.exec(line.text);
  if (task) {
    if ((task[3] ?? "").trim() === "") {
      view.dispatch({ changes: { from: line.from, to: line.to, insert: "" } });
      return done(view);
    }
    const insert = `\n${task[1]}[ ] `;
    view.dispatch({
      changes: { from: range.from, insert },
      selection: EditorSelection.cursor(range.from + insert.length),
    });
    return done(view);
  }

  const bullet = BULLET_CONTINUE.exec(line.text);
  if (bullet) {
    if ((bullet[3] ?? "").trim() === "") {
      view.dispatch({ changes: { from: line.from, to: line.to, insert: "" } });
      return done(view);
    }
    const insert = `\n${bullet[1]}${bullet[2]} `;
    view.dispatch({
      changes: { from: range.from, insert },
      selection: EditorSelection.cursor(range.from + insert.length),
    });
    return done(view);
  }

  const numbered = NUMBER_CONTINUE.exec(line.text);
  if (numbered) {
    if ((numbered[3] ?? "").trim() === "") {
      view.dispatch({ changes: { from: line.from, to: line.to, insert: "" } });
      return done(view);
    }
    const next = Number(numbered[2]) + 1;
    const insert = `\n${numbered[1]}${next}. `;
    view.dispatch({
      changes: { from: range.from, insert },
      selection: EditorSelection.cursor(range.from + insert.length),
    });
    return done(view);
  }

  return false;
}

export type StampMode = "date" | "time" | "datetime";

function pad(value: number): string {
  return String(value).padStart(2, "0");
}

/** A local-time stamp: `2026-09-20`, `14:32`, or both. */
export function formatStamp(mode: StampMode, date = new Date()): string {
  const day = `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
  const clock = `${pad(date.getHours())}:${pad(date.getMinutes())}`;
  if (mode === "date") return day;
  if (mode === "time") return clock;
  return `${day} ${clock}`;
}

/** Inscribes the current date, hour, or both at the caret. */
export function insertStamp(view: EditorView, mode: StampMode): boolean {
  return insertText(view, formatStamp(mode));
}

export const insertDivider = (view: EditorView) => insertText(view, "---\n");

export const insertCallout = (view: EditorView) => insertText(view, "> [!note] ");

export const insertTable = (view: EditorView) =>
  insertText(view, "|  |  |\n| --- | --- |\n|  |  |\n");

/** Opens a code block and rests the quill between the fences. */
export function insertCodeBlock(view: EditorView): boolean {
  const { from, to } = view.state.selection.main;
  const snippet = "```\n\n```";
  view.dispatch({
    changes: { from, to, insert: snippet },
    selection: EditorSelection.cursor(from + 4),
  });
  return done(view);
}

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
  { key: "Mod-Enter", run: formatTask, preventDefault: true },
  { key: "Enter", run: continueList },
  { key: "Tab", run: insertIndent, preventDefault: true },
  { key: "Shift-Tab", run: indentLess, preventDefault: true },
];
