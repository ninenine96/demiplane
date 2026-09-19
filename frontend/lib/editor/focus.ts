import {
  Decoration,
  ViewPlugin,
  type DecorationSet,
  type EditorView,
  type ViewUpdate,
} from "@codemirror/view";

const dimmedLine = Decoration.line({ class: "cm-dimmed-line" });

/** Dims every line but the one holding the cursor — Medium's focus mode. */
class FocusDim {
  decorations: DecorationSet;

  constructor(view: EditorView) {
    this.decorations = this.build(view);
  }

  update(update: ViewUpdate) {
    if (
      update.docChanged ||
      update.selectionSet ||
      update.viewportChanged ||
      update.focusChanged ||
      update.geometryChanged
    ) {
      this.decorations = this.build(update.view);
    }
  }

  build(view: EditorView): DecorationSet {
    const doc = view.state.doc;
    const active = doc.lineAt(view.state.selection.main.head).number;
    const ranges = [];
    for (let n = 1; n <= doc.lines; n += 1) {
      if (n === active) continue;
      ranges.push(dimmedLine.range(doc.line(n).from));
    }
    return Decoration.set(ranges, true);
  }
}

export const focusModeExtension = ViewPlugin.fromClass(FocusDim, {
  decorations: (value) => value.decorations,
});

/** Keeps the caret vertically centred — a quill on a ruled page. */
class Typewriter {
  constructor(private readonly view: EditorView) {}

  update(update: ViewUpdate) {
    if (!update.selectionSet && !update.docChanged) return;
    this.center(update.view);
  }

  private center(view: EditorView) {
    requestAnimationFrame(() => {
      if (!view.hasFocus) return;
      const coords = view.coordsAtPos(view.state.selection.main.head);
      const scroller = view.scrollDOM;
      if (!coords) return;
      const rect = scroller.getBoundingClientRect();
      scroller.scrollTop += coords.top - rect.top - rect.height / 2;
    });
  }
}

export const typewriterModeExtension = ViewPlugin.fromClass(Typewriter);
