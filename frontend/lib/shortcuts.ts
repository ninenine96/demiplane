export interface Shortcut {
  group: string;
  keys: string;
  label: string;
}

/** The single source of truth for the keyboard map and the help dialog. */
export const SHORTCUTS: Shortcut[] = [
  { group: "The archive", keys: "Mod+N", label: "Inscribe a new page" },
  { group: "The archive", keys: "Mod+\\", label: "Summon or fold the archive" },
  { group: "The archive", keys: "?", label: "Open this grimoire of keys" },
  { group: "The page", keys: "Mod+E", label: "Reveal or veil the page" },
  { group: "The page", keys: "Mod+B", label: "Bind the selection in bold" },
  { group: "The page", keys: "Mod+I", label: "Slant the selection (italic)" },
  { group: "The page", keys: "Mod+K", label: "Forge a link from the selection" },
  { group: "The page", keys: "Esc", label: "Close a menu, or return to the archive" },
];

export function isMac(): boolean {
  if (typeof navigator === "undefined") return false;
  return /Mac|iPhone|iPad|iPod/.test(navigator.userAgent);
}

/** Renders "Mod+E" as "⌘E" or "Ctrl+E" depending on the platform. */
export function formatKeys(keys: string): string {
  const mod = isMac() ? "⌘" : "Ctrl";
  return keys.replace(/Mod/g, mod).replace(/\+/g, isMac() ? "" : "+");
}
