import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { CornerDownLeft } from "lucide-react";
import { FLAVOUR } from "../../shared/messages";
import type { LocalNote } from "../db/dexie";
import { fuzzyFilter } from "../lib/fuzzy";
import { cx } from "./ui";

export interface PaletteCommand {
  id: string;
  label: string;
  group: string;
  icon?: ReactNode;
  run: () => void;
}

interface Entry {
  key: string;
  label: string;
  group: string;
  icon?: ReactNode;
  run: () => void;
}

export function CommandPalette({
  commands,
  notes,
  onSelectNote,
  onClose,
}: {
  commands: PaletteCommand[];
  notes: LocalNote[];
  onSelectNote: (id: string) => void;
  onClose: () => void;
}) {
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const listRef = useRef<HTMLUListElement | null>(null);

  const entries = useMemo<Entry[]>(() => {
    const trimmed = query.trim();
    const matchedCommands = trimmed
      ? fuzzyFilter(trimmed, commands, (command) => command.label)
      : commands;
    const living = notes.filter((note) => !note.deleted);
    const matchedNotes = trimmed
      ? fuzzyFilter(trimmed, living, (note) => note.title || FLAVOUR.unnamedNote)
      : [];
    return [
      ...matchedCommands.map((command) => ({
        key: `cmd:${command.id}`,
        label: command.label,
        group: command.group,
        icon: command.icon,
        run: command.run,
      })),
      ...matchedNotes.slice(0, 8).map((note) => ({
        key: `note:${note.id}`,
        label: note.title || FLAVOUR.unnamedNote,
        group: FLAVOUR.palettePages,
        run: () => onSelectNote(note.id),
      })),
    ].slice(0, 16);
  }, [commands, notes, query, onSelectNote]);

  useEffect(() => setActive(0), [query]);

  useEffect(() => {
    const node = listRef.current?.children[active] as HTMLElement | undefined;
    node?.scrollIntoView({ block: "nearest" });
  }, [active]);

  function choose(entry: Entry | undefined) {
    if (!entry) return;
    entry.run();
    onClose();
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={FLAVOUR.paletteTitle}
      onMouseDown={onClose}
      className="animate-fade-in-up fixed inset-0 z-[60] flex items-start justify-center bg-black/55 p-4 pt-[12vh] backdrop-blur-sm"
    >
      <div
        onMouseDown={(event) => event.stopPropagation()}
        className="animate-pop-in w-full max-w-lg overflow-hidden rounded-[var(--radius-card)] border border-[var(--color-void-700)] border-t-gold-500/40 bg-void-900 shadow-[0_24px_60px_rgba(0,0,0,0.6)]"
      >
        <input
          autoFocus
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "ArrowDown") {
              event.preventDefault();
              setActive((value) => Math.min(value + 1, entries.length - 1));
            } else if (event.key === "ArrowUp") {
              event.preventDefault();
              setActive((value) => Math.max(value - 1, 0));
            } else if (event.key === "Enter") {
              event.preventDefault();
              choose(entries[active]);
            } else if (event.key === "Escape") {
              event.preventDefault();
              onClose();
            }
          }}
          placeholder={FLAVOUR.palettePlaceholder}
          aria-label={FLAVOUR.palettePlaceholder}
          className="h-14 w-full border-b border-[var(--color-void-700)] bg-transparent px-4 text-base text-parchment-100 outline-none placeholder:text-parchment-500/70"
        />

        {entries.length === 0 ? (
          <p className="px-4 py-6 text-center text-sm text-parchment-500">
            {FLAVOUR.paletteEmpty}
          </p>
        ) : (
          <ul ref={listRef} className="max-h-[52vh] overflow-y-auto p-2">
            {entries.map((entry, index) => {
              const startsGroup =
                entries[index - 1]?.group !== entry.group;
              return (
                <li key={entry.key}>
                  {startsGroup ? (
                    <p className="px-3 pb-1 pt-3 text-[0.625rem] uppercase tracking-[0.18em] text-parchment-500">
                      {entry.group}
                    </p>
                  ) : null}
                  <button
                    type="button"
                    onMouseEnter={() => setActive(index)}
                    onClick={() => choose(entry)}
                    className={cx(
                      "flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-sm transition-colors",
                      index === active
                        ? "bg-white/[0.07] text-parchment-100"
                        : "text-parchment-300 hover:bg-white/[0.05]",
                    )}
                  >
                    {entry.icon ? (
                      <span
                        aria-hidden="true"
                        className="shrink-0 text-parchment-500"
                      >
                        {entry.icon}
                      </span>
                    ) : null}
                    <span className="min-w-0 flex-1 truncate">{entry.label}</span>
                    {index === active ? (
                      <CornerDownLeft
                        size={13}
                        aria-hidden="true"
                        className="shrink-0 text-parchment-500"
                      />
                    ) : null}
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
