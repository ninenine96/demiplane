import type { EditorView } from "@codemirror/view";

/**
 * A thin wire between app-level commands and whichever canvas is currently
 * mounted. The editor pane owns the view; the command palette just speaks into
 * this bridge instead of threading refs through the component tree.
 */
export interface EditorBridge {
  /** The live CodeMirror view, or `null` while the page is veiled. */
  getView: () => EditorView | null;
}

let current: EditorBridge | null = null;

export function setEditorBridge(bridge: EditorBridge): void {
  current = bridge;
}

/** Clears the bridge, but only if it still belongs to the caller. */
export function clearEditorBridge(bridge?: EditorBridge): void {
  if (!bridge || current === bridge) current = null;
}

/** Runs a view-bound command, but only when a canvas is mounted. */
export function withEditor(run: (view: EditorView) => void): boolean {
  const view = current?.getView();
  if (!view) return false;
  run(view);
  return true;
}
