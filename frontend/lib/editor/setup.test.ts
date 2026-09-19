import { describe, expect, it } from "vitest";
import { EditorState } from "@codemirror/state";
import { buildEditorExtensions } from "./setup";

function makeState(focusMode = false, typewriterMode = false) {
  return EditorState.create({
    doc: "# A page\n\n- [ ] a task\n",
    extensions: buildEditorExtensions({
      getCompletionData: () => ({ noteTitles: ["Some page"], tags: ["sigil"] }),
      onTogglePreview: () => {},
      focusMode,
      typewriterMode,
    }),
  });
}

describe("buildEditorExtensions", () => {
  it("assembles the full editing surface without conflict", () => {
    expect(() => makeState()).not.toThrow();
  });

  it("keeps focus and typewriter modes optional", () => {
    expect(() => makeState(true, true)).not.toThrow();
  });

  it("exposes completion sources and multiple selections", () => {
    const state = makeState();
    expect(state.languageDataAt("autocomplete", 0).length).toBeGreaterThan(0);
    expect(state.facet(EditorState.allowMultipleSelections)).toBe(true);
  });
});
