import {
  autocompletion,
  closeBrackets,
  closeBracketsKeymap,
  completionKeymap,
} from "@codemirror/autocomplete";
import { defaultKeymap, history, historyKeymap } from "@codemirror/commands";
import { EditorState, Prec, type Extension } from "@codemirror/state";
import {
  EditorView,
  drawSelection,
  keymap,
  placeholder,
  type KeyBinding,
} from "@codemirror/view";
import { FLAVOUR } from "../../../shared/messages";
import { markdownEditing, type CompletionDataGetter } from "./autocomplete";
import { focusModeExtension, typewriterModeExtension } from "./focus";
import { markdownFormatKeymap } from "./format";
import { spellCheckExtension } from "./spellcheck";
import { taskCheckboxExtension } from "./tasks";
import { arcaneTheme } from "./theme";

export interface EditorSetupOptions {
  getCompletionData: CompletionDataGetter;
  /** Called when the canvas asks to reveal or veil the page. */
  onTogglePreview: () => void;
  focusMode: boolean;
  typewriterMode: boolean;
}

/** The complete editing surface: language, completions, keys and skin. */
export function buildEditorExtensions({
  getCompletionData,
  onTogglePreview,
  focusMode,
  typewriterMode,
}: EditorSetupOptions): Extension[] {
  const editorKeymap: KeyBinding[] = [
    ...markdownFormatKeymap,
    {
      key: "Mod-e",
      preventDefault: true,
      run: () => {
        onTogglePreview();
        return true;
      },
    },
    ...closeBracketsKeymap,
    ...defaultKeymap,
    ...historyKeymap,
  ];

  return [
    markdownEditing(getCompletionData),
    autocompletion({ activateOnTyping: true }),
    closeBrackets(),
    EditorState.allowMultipleSelections.of(true),
    history(),
    drawSelection(),
    EditorView.lineWrapping,
    placeholder(FLAVOUR.editorPlaceholder),
    // Native spell check is off; the lexicon draws its own underlines.
    EditorView.contentAttributes.of({ spellcheck: "false" }),
    Prec.high(keymap.of(completionKeymap)),
    keymap.of(editorKeymap),
    arcaneTheme,
    taskCheckboxExtension,
    spellCheckExtension,
    focusMode ? focusModeExtension : [],
    typewriterMode ? typewriterModeExtension : [],
  ];
}
