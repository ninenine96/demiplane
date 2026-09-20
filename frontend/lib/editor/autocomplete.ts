import {
  snippetCompletion,
  type Completion,
  type CompletionContext,
  type CompletionResult,
} from "@codemirror/autocomplete";
import { EditorSelection, type Extension } from "@codemirror/state";
import { markdown, markdownLanguage } from "@codemirror/lang-markdown";
import { FLAVOUR } from "../../../shared/messages";
import { formatStamp, type StampMode } from "./format";

export interface EditorCompletionData {
  noteTitles: string[];
  tags: string[];
}

export type CompletionDataGetter = () => EditorCompletionData;

function matches(value: string, query: string): boolean {
  return value.toLowerCase().includes(query.toLowerCase());
}

/** Fuzzy-ish note titles, summoned by `[[`. */
function wikilinkSource(get: CompletionDataGetter) {
  return (context: CompletionContext): CompletionResult | null => {
    const before = context.matchBefore(/\[\[[^\]\n|]*/);
    if (!before) return null;
    const query = before.text.slice(2);
    const options: Completion[] = get()
      .noteTitles.filter((title) => matches(title, query))
      .sort((a, b) => a.localeCompare(b))
      .slice(0, 40)
      .map((title) => ({
        label: title,
        type: "class",
        apply: `[[${title}]]`,
      }));
    if (options.length === 0) return null;
    return { from: before.from + 2, options, validFor: /^[^\]\n|]*$/ };
  };
}

/** Existing sigils, summoned by `#` away from the start of a line. */
function tagSource(get: CompletionDataGetter) {
  return (context: CompletionContext): CompletionResult | null => {
    const before = context.matchBefore(/#[^\s#]*/);
    if (!before) return null;
    const line = context.state.doc.lineAt(before.from);
    if (line.text.slice(0, before.from - line.from).trim() === "") return null;
    const query = before.text.slice(1);
    const options: Completion[] = get()
      .tags.filter((tag) => matches(tag, query))
      .sort((a, b) => a.localeCompare(b))
      .slice(0, 30)
      .map((tag) => ({ label: tag, type: "keyword", apply: `#${tag}` }));
    if (options.length === 0) return null;
    return { from: before.from + 1, options, validFor: /^[^\s#]*$/ };
  };
}

const SLASH_OPTIONS: Completion[] = [
  snippetCompletion("# ${}", { label: FLAVOUR.fmtTitle, type: "keyword" }),
  snippetCompletion("## ${}", { label: FLAVOUR.fmtHeading, type: "keyword" }),
  snippetCompletion("### ${}", { label: FLAVOUR.fmtSubheading, type: "keyword" }),
  snippetCompletion("- ${}", { label: FLAVOUR.fmtList, type: "keyword" }),
  snippetCompletion("1. ${}", { label: FLAVOUR.fmtNumbered, type: "keyword" }),
  snippetCompletion("- [ ] ${}", { label: FLAVOUR.fmtTask, type: "keyword" }),
  snippetCompletion("> ${}", { label: FLAVOUR.fmtQuote, type: "keyword" }),
  snippetCompletion("```\n${}\n```", {
    label: FLAVOUR.fmtCodeBlock,
    type: "keyword",
  }),
  snippetCompletion("![${}](url)", { label: FLAVOUR.fmtImage, type: "keyword" }),
  snippetCompletion("[[${}]]", { label: FLAVOUR.fmtWikilink, type: "class" }),
  snippetCompletion("> [!note] ${}", {
    label: FLAVOUR.fmtCallout,
    type: "keyword",
  }),
  snippetCompletion("| ${} |  |\n| --- | --- |\n|  |  |", {
    label: FLAVOUR.fmtTable,
    type: "keyword",
  }),
  { label: FLAVOUR.fmtDivider, type: "keyword", apply: "---\n" },
  snippetCompletion("`${}`", { label: FLAVOUR.fmtCode, type: "keyword" }),
  stampOption(FLAVOUR.insertDate, "date"),
  stampOption(FLAVOUR.insertTime, "time"),
  stampOption(FLAVOUR.insertDateTime, "datetime"),
];

/** A workings entry that inscribes the moment it is chosen. */
function stampOption(label: string, mode: StampMode): Completion {
  return {
    label,
    type: "keyword",
    apply: (view, _completion, from, to) => {
      const text = formatStamp(mode);
      view.dispatch({
        changes: { from, to, insert: text },
        selection: EditorSelection.cursor(from + text.length),
      });
    },
  };
}

/** The `/` menu, offered at the start of a line. */
function slashSource(context: CompletionContext): CompletionResult | null {
  const before = context.matchBefore(/\/[a-zA-Z]*/);
  if (!before) return null;
  const line = context.state.doc.lineAt(before.from);
  if (line.text.slice(0, before.from - line.from).trim() !== "") return null;
  return { from: before.from, options: SLASH_OPTIONS, validFor: /^\/[a-zA-Z]*$/ };
}

/**
 * The markdown language plus all authoring suggestions. The language data must
 * be attached to the support's own `Language` instance (not `markdownLanguage`,
 * which is only the parser base) or the editor will never see it.
 */
export function markdownEditing(get: CompletionDataGetter): Extension {
  const support = markdown({ base: markdownLanguage });
  const combined = (context: CompletionContext): CompletionResult | null =>
    slashSource(context) ??
    wikilinkSource(get)(context) ??
    tagSource(get)(context);

  return [
    support,
    support.language.data.of({ autocomplete: combined }),
    // `[` is deliberately absent so `[[` opens a wikilink instead of a pair.
    support.language.data.of({
      closeBrackets: { brackets: ["(", "`", '"', "'"] },
    }),
  ];
}
