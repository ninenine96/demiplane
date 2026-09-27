import { RangeSetBuilder } from "@codemirror/state";
import {
  Decoration,
  EditorView,
  ViewPlugin,
  WidgetType,
  type DecorationSet,
  type ViewUpdate,
} from "@codemirror/view";
import { toggleTaskMarker } from "../checklist";
import { FLAVOUR } from "../../../shared/messages";

/** A checklist line: `- [ ]`, `- [x]`, or a numbered equivalent. */
export const TASK_LINE = /^\s*(?:[-*+]|\d+[.)])\s+\[([ xX])\]/;

/** A gilded box that replaces the raw `[ ]` marker while writing. */
class TaskCheckboxWidget extends WidgetType {
  constructor(readonly checked: boolean) {
    super();
  }

  eq(other: TaskCheckboxWidget): boolean {
    return other.checked === this.checked;
  }

  toDOM(): HTMLElement {
    const box = document.createElement("span");
    box.className = `cm-task-checkbox${this.checked ? " cm-task-checkbox--done" : ""}`;
    box.setAttribute("role", "checkbox");
    box.setAttribute("aria-checked", String(this.checked));
    box.setAttribute("aria-label", this.checked ? FLAVOUR.taskDone : FLAVOUR.taskOpen);
    return box;
  }

  ignoreEvent(): boolean {
    return false;
  }
}

function buildDecorations(view: EditorView): DecorationSet {
  const builder = new RangeSetBuilder<Decoration>();
  const doc = view.state.doc;
  let fenced = false;
  for (let n = 1; n <= doc.lines; n += 1) {
    const line = doc.line(n);
    if (/^\s*(?:```|~~~)/.test(line.text)) {
      fenced = !fenced;
      continue;
    }
    if (fenced) continue;
    const match = TASK_LINE.exec(line.text);
    if (!match) continue;
    const start = line.from + match.index + match[0].length - 3;
    builder.add(
      start,
      start + 3,
      Decoration.replace({
        widget: new TaskCheckboxWidget((match[1] ?? " ").toLowerCase() === "x"),
      }),
    );
  }
  return builder.finish();
}

const taskCheckboxPlugin = ViewPlugin.fromClass(
  class {
    decorations: DecorationSet;

    constructor(view: EditorView) {
      this.decorations = buildDecorations(view);
    }

    update(update: ViewUpdate): void {
      if (update.docChanged) {
        this.decorations = buildDecorations(update.view);
      }
    }
  },
  { decorations: (plugin) => plugin.decorations },
);

/** Clicking a box in the canvas flips the matching line. */
const taskClickHandler = EditorView.domEventHandlers({
  mousedown(event, view) {
    const target = event.target as HTMLElement | null;
    const box = target?.closest?.(".cm-task-checkbox");
    if (!box) return false;
    const pos = view.posAtDOM(box, 0);
    const line = view.state.doc.lineAt(pos);
    const toggled = toggleTaskMarker(line.text);
    if (toggled === null) return false;
    view.dispatch({ changes: { from: line.from, to: line.to, insert: toggled } });
    event.preventDefault();
    return true;
  },
});

/** Inline, clickable checkboxes for the editing canvas. */
export const taskCheckboxExtension = [taskCheckboxPlugin, taskClickHandler];
