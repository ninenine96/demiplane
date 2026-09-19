import { useMemo, useRef, useState } from "react";
import {
  Download,
  LogOut,
  MoreHorizontal,
  PanelLeftClose,
  Plus,
  RefreshCw,
  SlidersHorizontal,
  Upload,
  ZoomIn,
  ZoomOut,
} from "lucide-react";
import { FLAVOUR } from "../../shared/messages";
import type { LocalNote } from "../db/dexie";
import { excerpt } from "../lib/markdown";
import { buildSearchIndex, searchNoteIds } from "../lib/search";
import {
  Chip,
  EmptyState,
  Menu,
  MenuDivider,
  MenuItem,
  MenuLabel,
  cx,
} from "./ui";

interface SidebarProps {
  notes: LocalNote[];
  activeId: string | null;
  email: string;
  onSelect: (id: string) => void;
  onNew: () => void;
  onSync: () => void;
  onLogout: () => void;
  onExport: () => void;
  onImport: (file: File) => void;
  onCollapse: () => void;
  scale: number;
  canZoomIn: boolean;
  canZoomOut: boolean;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onZoomReset: () => void;
}

export function Sidebar({
  notes,
  activeId,
  email,
  onSelect,
  onNew,
  onSync,
  onLogout,
  onExport,
  onImport,
  onCollapse,
  scale,
  canZoomIn,
  canZoomOut,
  onZoomIn,
  onZoomOut,
  onZoomReset,
}: SidebarProps) {
  const [query, setQuery] = useState("");
  const [showTrash, setShowTrash] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
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
    <aside className="animate-archive-in flex h-full w-full flex-col border-r border-[var(--color-void-700)] bg-void-900 lg:w-72 lg:flex-none">
      <header
        className="px-4 pb-3"
        style={{ paddingTop: "calc(1rem + var(--safe-top))" }}
      >
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={onCollapse}
            aria-label="Fold the archive away"
            title="Fold the archive away"
            className="hidden h-8 w-8 items-center justify-center rounded-lg text-parchment-500 transition-colors hover:bg-white/[0.06] hover:text-parchment-100 lg:inline-flex"
          >
            <PanelLeftClose size={17} aria-hidden="true" />
          </button>
          <h1 className="wordmark flex-1 font-display text-[0.9375rem] tracking-[0.08em] text-gold-400">
            Demiplane
          </h1>
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
          <Menu
            label="More"
            trigger={<MoreHorizontal size={17} />}
            panelClassName="w-64"
          >
            {(close) => (
              <>
                <MenuLabel>{email}</MenuLabel>
                <MenuItem
                  icon={<Plus size={15} />}
                  onClick={() => {
                    onNew();
                    close();
                  }}
                >
                  {FLAVOUR.newNote}
                </MenuItem>
                <MenuItem
                  icon={<RefreshCw size={15} />}
                  onClick={() => {
                    onSync();
                    close();
                  }}
                >
                  {FLAVOUR.syncNow}
                </MenuItem>
                <MenuDivider />
                <MenuItem
                  icon={<Download size={15} />}
                  onClick={() => {
                    onExport();
                    close();
                  }}
                >
                  {FLAVOUR.export}
                </MenuItem>
                <MenuItem
                  icon={<Upload size={15} />}
                  onClick={() => {
                    importInput.current?.click();
                    close();
                  }}
                >
                  {FLAVOUR.import}
                </MenuItem>
                <MenuDivider />
                <MenuItem
                  icon={<LogOut size={15} />}
                  onClick={() => {
                    onLogout();
                    close();
                  }}
                >
                  {FLAVOUR.logout}
                </MenuItem>
              </>
            )}
          </Menu>
        </div>

        <div className="mt-3 flex items-center gap-2">
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={FLAVOUR.searchPlaceholder}
            aria-label={FLAVOUR.searchPlaceholder}
            className="h-8 min-w-0 flex-1 border-b border-[var(--color-void-700)] bg-transparent px-0.5 text-sm text-parchment-100 outline-none transition-colors placeholder:text-parchment-500/70 focus:border-gold-500/50"
          />
          <button
            type="button"
            onClick={onNew}
            aria-label={FLAVOUR.newNote}
            title={FLAVOUR.newNote}
            className="grid h-8 w-8 shrink-0 place-items-center rounded-lg text-parchment-500 transition-colors hover:bg-white/[0.06] hover:text-gold-300"
          >
            <Plus size={17} aria-hidden="true" />
          </button>
          <button
            type="button"
            onClick={() => setShowFilters((value) => !value)}
            aria-label="Filters"
            aria-pressed={showFilters}
            title="Filters"
            className={cx(
              "grid h-8 w-8 shrink-0 place-items-center rounded-lg transition-colors hover:bg-white/[0.06]",
              showFilters
                ? "text-gold-300"
                : "text-parchment-500 hover:text-parchment-100",
            )}
          >
            <SlidersHorizontal size={16} aria-hidden="true" />
          </button>
        </div>

        {showFilters ? (
          <div className="mt-3 flex items-center gap-2">
            <select
              value={folder}
              onChange={(event) => setFolder(event.target.value)}
              aria-label="Filter by satchel"
              className="h-8 min-w-0 flex-1 rounded-lg border border-[var(--color-void-700)] bg-void-950/60 px-2 text-xs text-parchment-300 outline-none focus:border-gold-500/50"
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
        ) : null}
      </header>

      <nav className="min-h-0 flex-1 overflow-y-auto px-2 pb-4">
        {visible.length === 0 ? (
          <EmptyState>
            {showTrash
              ? FLAVOUR.emptyTrash
              : query
                ? FLAVOUR.emptySearch
                : FLAVOUR.emptyNotes}
          </EmptyState>
        ) : (
          <ul className="animate-fade-in-up space-y-0.5">
            {visible.map((note) => (
              <li key={note.id}>
                <button
                  onClick={() => onSelect(note.id)}
                  className={cx(
                    "w-full rounded-lg px-3 py-2.5 text-left transition-colors",
                    note.id === activeId
                      ? "bg-white/[0.045] shadow-[inset_2px_0_0_0_var(--color-gold-400)]"
                      : "hover:bg-white/[0.05]",
                  )}
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
                  <span className="mt-0.5 block truncate text-xs text-parchment-500">
                    {excerpt(note.body)}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </nav>

      <footer
        className="flex items-center justify-between gap-2 border-t border-[var(--color-void-700)] px-4 pt-2.5"
        style={{ paddingBottom: "calc(0.625rem + var(--safe-bottom))" }}
      >
        <span className="text-[0.625rem] uppercase tracking-[0.18em] text-parchment-500">
          {FLAVOUR.enlarge}
        </span>
        <div className="flex items-center gap-0.5">
          <button
            type="button"
            onClick={onZoomOut}
            disabled={!canZoomOut}
            aria-label={FLAVOUR.enlargeDown}
            title={FLAVOUR.enlargeDown}
            className="grid h-7 w-7 place-items-center rounded-md text-parchment-500 transition-colors hover:bg-white/[0.06] hover:text-parchment-100 disabled:opacity-30 disabled:hover:bg-transparent"
          >
            <ZoomOut size={15} aria-hidden="true" />
          </button>
          <button
            type="button"
            onClick={onZoomReset}
            aria-label={FLAVOUR.trueSight}
            title={FLAVOUR.trueSight}
            className="min-w-[2.5rem] rounded-md py-1 text-center text-[0.6875rem] tabular-nums text-parchment-500 transition-colors hover:text-parchment-100"
          >
            {Math.round(scale * 100)}%
          </button>
          <button
            type="button"
            onClick={onZoomIn}
            disabled={!canZoomIn}
            aria-label={FLAVOUR.enlargeUp}
            title={FLAVOUR.enlargeUp}
            className="grid h-7 w-7 place-items-center rounded-md text-parchment-500 transition-colors hover:bg-white/[0.06] hover:text-parchment-100 disabled:opacity-30 disabled:hover:bg-transparent"
          >
            <ZoomIn size={15} aria-hidden="true" />
          </button>
        </div>
      </footer>
    </aside>
  );
}
