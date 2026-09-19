import {
  snippetCompletion,
  type Completion,
  type CompletionContext,
  type CompletionResult,
} from "@codemirror/autocomplete";
import type { Extension } from "@codemirror/state";
import { markdown, markdownLanguage } from "@codemirror/lang-markdown";

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
  snippetCompletion("# ${}", { label: "Heading 1", type: "keyword" }),
  snippetCompletion("## ${}", { label: "Heading 2", type: "keyword" }),
  snippetCompletion("### ${}", { label: "Heading 3", type: "keyword" }),
  snippetCompletion("- ${}", { label: "Bullet list", type: "keyword" }),
  snippetCompletion("1. ${}", { label: "Numbered list", type: "keyword" }),
  snippetCompletion("- [ ] ${}", { label: "Task", type: "keyword" }),
  snippetCompletion("> ${}", { label: "Quote", type: "keyword" }),
  snippetCompletion("```\n${}\n```", { label: "Code block", type: "keyword" }),
  snippetCompletion("![${}](url)", { label: "Image", type: "keyword" }),
  snippetCompletion("[[${}]]", { label: "Wikilink", type: "class" }),
  snippetCompletion("> [!note] ${}", { label: "Callout", type: "keyword" }),
  snippetCompletion("| ${} |  |\n| --- | --- |\n|  |  |", {
    label: "Table",
    type: "keyword",
  }),
  { label: "Divider", type: "keyword", apply: "---\n" },
  snippetCompletion("`${}`", { label: "Inline code", type: "keyword" }),
];

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
