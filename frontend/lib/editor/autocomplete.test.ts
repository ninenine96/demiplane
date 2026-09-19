import { describe, expect, it } from "vitest";
import { EditorState } from "@codemirror/state";
import { markdownEditing } from "./autocomplete";

function state() {
  return EditorState.create({
    doc: "# A page\n\nSome prose.",
    extensions: [markdownEditing(() => ({ noteTitles: [], tags: [] }))],
  });
}

describe("markdownEditing", () => {
  it("registers an autocomplete source on the active language", () => {
    const sources = state().languageDataAt("autocomplete", 0);
    expect(sources.length).toBeGreaterThan(0);
  });

  it("excludes `[` from auto-paired brackets so `[[` stays a wikilink", () => {
    const configs = state().languageDataAt<{
      brackets: readonly string[];
    }>("closeBrackets", 0);
    expect(configs[0]?.brackets).toContain("(");
    expect(configs[0]?.brackets).not.toContain("[");
  });
});
