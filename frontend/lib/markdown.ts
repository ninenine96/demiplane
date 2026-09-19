import {
  marked,
  type Tokens,
  type TokenizerAndRendererExtension,
} from "marked";
import DOMPurify from "dompurify";

marked.setOptions({ gfm: true, breaks: true });

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

interface HighlightToken extends Tokens.Generic {
  text: string;
  tokens: Tokens.Generic[];
}

interface WikiLinkToken extends Tokens.Generic {
  target: string;
  label: string;
}

interface CalloutToken extends Tokens.Generic {
  calloutType: string;
  title: string;
  tokens: Tokens.Generic[];
}

const highlightExtension: TokenizerAndRendererExtension = {
  name: "highlight",
  level: "inline",
  start(src: string) {
    return src.indexOf("==");
  },
  tokenizer(src: string) {
    const match = /^==([^=\n]+)==/.exec(src);
    if (!match) return undefined;
    const inner = match[1] ?? "";
    return {
      type: "highlight",
      raw: match[0],
      text: inner,
      tokens: this.lexer.inlineTokens(inner),
    } satisfies HighlightToken;
  },
  renderer(token) {
    const { tokens } = token as HighlightToken;
    return `<mark>${this.parser.parseInline(tokens)}</mark>`;
  },
};

const wikilinkExtension: TokenizerAndRendererExtension = {
  name: "wikilink",
  level: "inline",
  start(src: string) {
    return src.indexOf("[[");
  },
  tokenizer(src: string) {
    const match = /^\[\[([^\]|]+)(?:\|([^\]]+))?\]\]/.exec(src);
    if (!match) return undefined;
    const target = (match[1] ?? "").trim();
    return {
      type: "wikilink",
      raw: match[0],
      target,
      label: (match[2] ?? match[1] ?? target).trim(),
    } satisfies WikiLinkToken;
  },
  renderer(token) {
    const { target, label } = token as WikiLinkToken;
    return `<a href="#" class="wikilink" data-wikilink="${escapeHtml(target)}">${escapeHtml(label)}</a>`;
  },
};

const calloutExtension: TokenizerAndRendererExtension = {
  name: "callout",
  level: "block",
  start(src: string) {
    const match = /^> \[!/m.exec(src);
    return match?.index;
  },
  tokenizer(src: string) {
    const match = /^> \[!(\w+)\][+-]?([^\n]*)\n((?:>[^\n]*(?:\n|$))*)/.exec(
      src,
    );
    if (!match) return undefined;
    const calloutType = (match[1] ?? "note").toLowerCase();
    const title =
      (match[2] ?? "").trim() ||
      calloutType.charAt(0).toUpperCase() + calloutType.slice(1);
    const body = (match[3] ?? "")
      .replace(/^> ?/gm, "")
      .replace(/\n$/, "");
    return {
      type: "callout",
      raw: match[0],
      calloutType,
      title,
      tokens: this.lexer.blockTokens(body, []),
    } satisfies CalloutToken;
  },
  renderer(token) {
    const { calloutType, title, tokens } = token as CalloutToken;
    const body = this.parser.parse(tokens);
    return (
      `<div class="callout callout-${calloutType}">` +
      `<p class="callout-title">${escapeHtml(title)}</p>${body}</div>`
    );
  },
};

marked.use({
  extensions: [highlightExtension, wikilinkExtension, calloutExtension],
});

/** Renders markdown to sanitized HTML for the live preview. */
export function renderMarkdown(markdown: string): string {
  const html = marked.parse(markdown, { async: false }) as string;
  return DOMPurify.sanitize(html, {
    USE_PROFILES: { html: true },
    ADD_ATTR: ["data-wikilink"],
  });
}

/** A short plain-text excerpt for the note list. */
export function excerpt(markdown: string, length = 120): string {
  const text = markdown
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/[#>*_`~\-[\]()!]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  return text.length > length ? `${text.slice(0, length)}…` : text;
}
