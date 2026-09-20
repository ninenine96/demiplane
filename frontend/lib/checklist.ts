/**
 * GFM task lists — the checklists an adventurer ticks off between portals.
 *
 * The editor and the preview share these helpers so a checkbox clicked in the
 * rendered page always maps back to the same source line.
 */

const TASK_MARKER = /^(\s*(?:[-*+]|\d+[.)])\s+)\[([ xX])\]/;
const FENCE = /^\s*(?:```|~~~)/;

/** True when a single line is a GFM task item. */
export function isTaskLine(line: string): boolean {
  return TASK_MARKER.test(line);
}

/**
 * Flips `[ ]` and `[x]` on one line. Returns `null` when the line carries no
 * task marker, so callers can choose to promote it into one.
 */
export function toggleTaskMarker(line: string): string | null {
  const match = TASK_MARKER.exec(line);
  if (!match) return null;
  const checked = (match[2] ?? " ").toLowerCase() === "x";
  const next = checked ? "[ ]" : "[x]";
  return match[1] + next + line.slice(match[0].length);
}

/**
 * Flips the `index`-th task in a markdown document, counting in source order
 * and ignoring fenced code. Used when a checkbox is clicked in the preview.
 */
export function toggleTaskAt(markdown: string, index: number): string {
  const lines = markdown.split("\n");
  let seen = -1;
  let fenced = false;
  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i] ?? "";
    if (FENCE.test(line)) {
      fenced = !fenced;
      continue;
    }
    if (fenced) continue;
    const toggled = toggleTaskMarker(line);
    if (toggled === null) continue;
    seen += 1;
    if (seen === index) {
      lines[i] = toggled;
      break;
    }
  }
  return lines.join("\n");
}

/** How many task items a page holds — the count shown while checking. */
export function countTasks(markdown: string): number {
  let total = 0;
  let fenced = false;
  for (const line of markdown.split("\n")) {
    if (FENCE.test(line)) {
      fenced = !fenced;
      continue;
    }
    if (!fenced && isTaskLine(line)) total += 1;
  }
  return total;
}
