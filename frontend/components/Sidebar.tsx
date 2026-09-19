import { useMemo, useRef, useState } from "react";
import { Download, Plus, Upload } from "lucide-react";
import { FLAVOUR } from "../../shared/messages";
import type { LocalNote } from "../db/dexie";
import type { SyncStatus } from "../sync/engine";
import { excerpt } from "../lib/markdown";
import { buildSearchIndex, searchNoteIds } from "../lib/search";
import { SyncBadge } from "./SyncBadge";
import { Button, Chip, EmptyState, Input } from "./ui";

interface SidebarProps {
  notes: LocalNote[];
  activeId: string | null;
  email: string;
  syncStatus: SyncStatus;
  onSelect: (id: string) => void;
  onNew: () => void;
  onSync: () => void;
  onLogout: () => void;
  onExport: () => void;
  onImport: (file: File) => void;
}

export function Sidebar({
  notes,
  activeId,
  email,
  syncStatus,
  onSelect,
  onNew,
  onSync,
  onLogout,
  onExport,
  onImport,
}: SidebarProps) {
  const [query, setQuery] = useState("");
  const [showTrash, setShowTrash] = useState(false);
  const [folder, setFolder] = useState<string>("all");
  const importInput = useRef<HTMLInputElement | null>(null);

  const folders = useMemo(() => {
    const set = new Set<string>();
    for (const note of notes) {
      if (!note.deleted && note.folder) set.add(note.folder);
    }
    return [...set].sort();
  }, [notes]);

  const searchIndex = useMemo(() => buildSearchIndex(notes), [notes]);
  const matchedIds = useMemo(
    () => searchNoteIds(searchIndex, query),
    [searchIndex, query],
  );

  const visible = useMemo(() => {
    return notes
      .filter((note) => note.deleted === showTrash)
      .filter((note) =>
        folder === "all" ? true : (note.folder ?? "") === folder,
      )
      .filter((note) => matchedIds === null || matchedIds.has(note.id))
      .sort((a, b) => b.updatedAt - a.updatedAt);
  }, [notes, showTrash, folder, matchedIds]);

  return (
    <aside className="flex h-full w-full flex-col border-r border-[var(--color-void-700)] bg-void-900 lg:w-80 lg:flex-none">
      <header
        className="space-y-4 border-b border-[var(--color-void-700)] px-5 pb-5"
        style={{ paddingTop: "calc(1.25rem + var(--safe-top))" }}
      >
        <div className="flex items-center justify-between gap-3">
          <h1 className="font-display text-lg tracking-wide text-gold-400">
            Demiplane
          </h1>
          <button
            onClick={onLogout}
            className="rounded-lg px-2 py-1 text-xs text-parchment-500 transition-colors hover:bg-white/5 hover:text-parchment-100"
          >
            {FLAVOUR.logout}
          </button>
        </div>
        <div className="space-y-1.5">
          <SyncBadge status={syncStatus} onSync={onSync} />
          <p className="truncate text-xs text-parchment-500" title={email}>
            {email}
          </p>
        </div>
        <Button onClick={onNew} block icon={<Plus size={16} />}>
          {FLAVOUR.newNote}
        </Button>
      </header>

      <div className="space-y-3 px-5 py-4">
        <Input
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder={FLAVOUR.searchPlaceholder}
          aria-label={FLAVOUR.searchPlaceholder}
        />
        <div className="flex items-center gap-2">
          <select
            value={folder}
            onChange={(event) => setFolder(event.target.value)}
            aria-label="Filter by satchel"
            className="h-9 min-w-0 flex-1 rounded-[var(--radius-control)] border border-[var(--color-void-700)] bg-void-950/60 px-2 text-xs text-parchment-300 outline-none focus:border-arcane-400"
          >
            <option value="all">All satchels</option>
            {folders.map((name) => (
              <option key={name} value={name}>
                {name}
              </option>
            ))}
          </select>
          <Chip
            active={showTrash}
            onClick={() => setShowTrash((value) => !value)}
          >
            Void
          </Chip>
        </div>
      </div>

      <nav className="min-h-0 flex-1 overflow-y-auto px-3 pb-4">
        {visible.length === 0 ? (
          <EmptyState>
            {showTrash
              ? FLAVOUR.emptyTrash
              : query
                ? FLAVOUR.emptySearch
                : FLAVOUR.emptyNotes}
          </EmptyState>
        ) : (
          <ul className="space-y-1.5">
            {visible.map((note) => (
              <li key={note.id}>
                <button
                  onClick={() => onSelect(note.id)}
                  className={`w-full rounded-[var(--radius-control)] px-3 py-2.5 text-left transition-colors ${
                    note.id === activeId
                      ? "bg-arcane-500/15 ring-1 ring-inset ring-arcane-500/30"
                      : "hover:bg-white/[0.05]"
                  }`}
                >
                  <span className="flex items-center gap-2">
                    <span className="min-w-0 flex-1 truncate text-sm font-medium text-parchment-100">
                      {note.title || FLAVOUR.unnamedNote}
                    </span>
                    {note.dirty === 1 ? (
                      <span
                        className="h-1.5 w-1.5 flex-none rounded-full bg-gold-400"
                        title={FLAVOUR.savePending}
                      />
                    ) : null}
                  </span>
                  <span className="mt-1 block truncate text-xs text-parchment-500">
                    {excerpt(note.body)}
                  </span>
                  {note.folder || note.tags.length > 0 ? (
                    <span className="mt-2 flex flex-wrap gap-1.5">
                      {note.folder ? (
                        <span className="rounded-md bg-white/[0.06] px-1.5 py-0.5 text-[10px] text-parchment-300">
                          {note.folder}
                        </span>
                      ) : null}
                      {note.tags.slice(0, 4).map((tag) => (
                        <span
                          key={tag}
                          className="rounded-md bg-gold-400/10 px-1.5 py-0.5 text-[10px] text-gold-400"
                        >
                          #{tag}
                        </span>
                      ))}
                    </span>
                  ) : null}
                </button>
              </li>
            ))}
          </ul>
        )}
      </nav>

      <footer
        className="grid grid-cols-2 gap-3 border-t border-[var(--color-void-700)] px-4 pt-4"
        style={{ paddingBottom: "calc(1rem + var(--safe-bottom))" }}
      >
        <input
          ref={importInput}
          type="file"
          accept=".zip,application/zip"
          className="hidden"
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (file) onImport(file);
            event.target.value = "";
          }}
        />
        <Button
          variant="ghost"
          size="sm"
          icon={<Download size={15} />}
          onClick={onExport}
          className="h-auto py-2.5 text-[11px] leading-tight"
        >
          {FLAVOUR.export}
        </Button>
        <Button
          variant="ghost"
          size="sm"
          icon={<Upload size={15} />}
          onClick={() => importInput.current?.click()}
          className="h-auto py-2.5 text-[11px] leading-tight"
        >
          {FLAVOUR.import}
        </Button>
      </footer>
    </aside>
  );
}
