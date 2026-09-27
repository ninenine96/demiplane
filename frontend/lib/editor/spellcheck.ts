import { RangeSetBuilder, StateEffect, StateField } from "@codemirror/state";
import {
  Decoration,
  EditorView,
  ViewPlugin,
  type DecorationSet,
  type ViewUpdate,
} from "@codemirror/view";
import {
  isMisspelled,
  isProtectedSpan,
  LEXICON_EVENT,
  loadSpell,
  protectedRanges,
  WORD_PATTERN,
} from "../spellcheck";

/**
 * The lexicon's eye over the canvas: a wavy gild for words the dictionary
 * doubts, redrawn a beat after typing stops. The browser's own spell check is
 * switched off so the underlines and the menu speak with one voice.
 */

const setSpelling = StateEffect.define<DecorationSet>();

const spellingField = StateField.define<DecorationSet>({
  create: () => Decoration.none,
  update(value, transaction) {
    let next = value.map(transaction.changes);
    for (const effect of transaction.effects) {
      if (effect.is(setSpelling)) next = effect.value;
    }
    return next;
  },
  provide: (field) => EditorView.decorations.from(field),
});

const doubtfulMark = Decoration.mark({ class: "cm-misspelled" });

const FENCE = /^\s*(?:```|~~~)/;

function scan(view: EditorView): DecorationSet {
  const builder = new RangeSetBuilder<Decoration>();
  const doc = view.state.doc;
  let fenced = false;
  for (let n = 1; n <= doc.lines; n += 1) {
    const line = doc.line(n);
    if (FENCE.test(line.text)) {
      fenced = !fenced;
      continue;
    }
    if (fenced) continue;
    const shielded = protectedRanges(line.text);
    for (const match of line.text.matchAll(WORD_PATTERN)) {
      const from = match.index;
      const to = from + match[0].length;
      if (isProtectedSpan(shielded, from, to)) continue;
      if (!isMisspelled(match[0])) continue;
      builder.add(line.from + from, line.from + to, doubtfulMark);
    }
  }
  return builder.finish();
}

const spellPlugin = ViewPlugin.fromClass(
  class {
    private timer = 0;
    private view: EditorView | null;
    private onLexicon = () => this.schedule(0);

    constructor(view: EditorView) {
      this.view = view;
      void loadSpell().then((spell) => {
        if (spell) this.schedule(0);
      });
      if (typeof window !== "undefined") {
        window.addEventListener(LEXICON_EVENT, this.onLexicon);
      }
    }

    update(update: ViewUpdate): void {
      if (update.docChanged) this.schedule();
    }

    schedule(delay = 320): void {
      if (typeof window === "undefined") return;
      window.clearTimeout(this.timer);
      this.timer = window.setTimeout(() => {
        if (!this.view) return;
        this.view.dispatch({ effects: setSpelling.of(scan(this.view)) });
      }, delay);
    }

    destroy(): void {
      if (typeof window !== "undefined") {
        window.clearTimeout(this.timer);
        window.removeEventListener(LEXICON_EVENT, this.onLexicon);
      }
      this.view = null;
    }
  },
);

/** Underlines doubtful words in the canvas, in step with the right-click menu. */
export const spellCheckExtension = [spellingField, spellPlugin];
