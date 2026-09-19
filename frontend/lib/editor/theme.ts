import { HighlightStyle, syntaxHighlighting } from "@codemirror/language";
import { tags } from "@lezer/highlight";
import { EditorView } from "@codemirror/view";

/**
 * The arcane archive, rendered in CodeMirror. Every colour is drawn from the
 * design tokens in index.css so the editor reads as one surface with the rest
 * of the app. Caret and selection are gilded; syntax melts into the manuscript.
 */
export const arcaneTheme = [
  EditorView.theme(
    {
      "&": {
        color: "var(--color-parchment-100)",
        backgroundColor: "transparent",
        fontSize: "1rem",
      },
      ".cm-scroller": {
        fontFamily: "var(--font-sans)",
        lineHeight: "1.8",
        overflow: "auto",
      },
      ".cm-content": {
        caretColor: "var(--color-gold-300)",
        padding: "14px 12px",
        fontFamily: "var(--font-sans)",
      },
      ".cm-line": {
        padding: "0",
      },
      "&.cm-focused": {
        outline: "none",
      },
      ".cm-cursor, .cm-dropCursor": {
        borderLeftColor: "var(--color-gold-300)",
        borderLeftWidth: "2px",
      },
      "&.cm-focused .cm-selectionBackground, .cm-selectionBackground, .cm-content ::selection":
        {
          background: "rgba(195, 161, 92, 0.24)",
        },
      ".cm-activeLine": {
        backgroundColor: "rgba(255, 255, 255, 0.025)",
      },
      ".cm-gutters": {
        display: "none",
      },
      ".cm-placeholder": {
        color: "rgba(164, 153, 138, 0.7)",
        fontStyle: "normal",
      },
      ".cm-tooltip": {
        border: "1px solid var(--color-void-700)",
        borderRadius: "var(--radius-card)",
        background: "var(--color-void-800)",
        color: "var(--color-parchment-100)",
        boxShadow: "0 20px 50px rgba(0, 0, 0, 0.6)",
        overflow: "hidden",
      },
      ".cm-tooltip-autocomplete ul": {
        fontFamily: "var(--font-sans)",
        maxHeight: "16rem",
      },
      ".cm-tooltip-autocomplete ul li": {
        padding: "6px 10px",
        color: "var(--color-parchment-300)",
      },
      ".cm-tooltip-autocomplete ul li[aria-selected]": {
        background: "rgba(95, 77, 146, 0.32)",
        color: "var(--color-parchment-100)",
      },
      ".cm-completionLabel": {
        fontSize: "0.875rem",
      },
      ".cm-completionDetail": {
        color: "var(--color-parchment-500)",
        fontStyle: "normal",
        marginLeft: "0.75rem",
      },
      ".cm-completionMatchedText": {
        color: "var(--color-gold-300)",
        textDecoration: "none",
        fontWeight: "600",
      },
      ".cm-dimmed-line": {
        opacity: "0.32",
        transition: "opacity 180ms ease",
      },
      ".cm-wikilink": {
        color: "var(--color-arcane-300)",
        textDecoration: "underline",
        textDecorationColor: "rgba(163, 150, 201, 0.4)",
        textUnderlineOffset: "2px",
      },
    },
    { dark: true },
  ),
  syntaxHighlighting(
    HighlightStyle.define([
      { tag: tags.heading, color: "var(--color-parchment-100)", fontWeight: "600" },
      { tag: tags.strong, color: "var(--color-gold-300)", fontWeight: "600" },
      { tag: tags.emphasis, fontStyle: "italic" },
      { tag: tags.strikethrough, textDecoration: "line-through" },
      { tag: tags.link, color: "var(--color-gold-300)" },
      { tag: tags.url, color: "var(--color-parchment-500)" },
      { tag: tags.monospace, fontFamily: "var(--font-mono)" },
      { tag: tags.quote, color: "var(--color-parchment-500)", fontStyle: "italic" },
      { tag: tags.list, color: "var(--color-parchment-500)" },
      { tag: tags.processingInstruction, color: "var(--color-parchment-500)" },
      { tag: tags.contentSeparator, color: "var(--color-parchment-500)" },
      { tag: tags.meta, color: "var(--color-parchment-500)" },
    ]),
  ),
];
