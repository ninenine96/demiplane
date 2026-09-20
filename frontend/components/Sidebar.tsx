import { useEffect, useMemo, useRef, useState } from "react";
import {
  Download,
  KeyRound,
  Keyboard,
  LogOut,
  MoreHorizontal,
  Palette,
  PanelLeftClose,
  Plus,
  RefreshCw,
  RotateCcw,
  Scroll,
  SlidersHorizontal,
  Trash2,
  Undo2,
  Upload,
  ZoomIn,
  ZoomOut,
} from "lucide-react";
import { FLAVOUR } from "../../shared/messages";
import type { LocalNote } from "../db/dexie";
import { excerpt } from "../lib/markdown";
import { buildSearchIndex, searchNoteIds } from "../lib/search";
import { ContextMenu, useContextMenu } from "./ContextMenu";
import { ThemeList } from "./ThemePicker";
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
  onShowShortcuts: () => void;
  onShowAgentKeys: () => void;
  onDelete: (id: string) => void;
  onUndelete: (id: string) => void;
  scale: number;
  onScaleChange: (value: number) => void;
  onZoomReset: () => void;
  themeId: string;
  onThemeChange: (id: string) => void;
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
  onShowShortcuts,
  onShowAgentKeys,
  onDelete,
  onUndelete,
  scale,
  onScaleChange,
  onZoomReset,
  themeId,
  onThemeChange,
}: SidebarProps) {
  const [query, setQuery] = useState("");
  const [showTrash, setShowTrash] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [scaleOpen, setScaleOpen] = useState(false);
  const [themeOpen, setThemeOpen] = useState(false);
  const [folder, setFolder] = useState<string>("all");
  const importInput = useRef<HTMLInputElement | null>(null);
  const scaleRef = useRef<HTMLElement | null>(null);
  const contextMenu = useContextMenu();

  useEffect(() => {
    if (!scaleOpen && !themeOpen) return;
    const onPointer = (event: globalThis.MouseEvent) => {
      if (!scaleRef.current?.contains(event.target as Node)) {
        setScaleOpen(false);
        setThemeOpen(false);
      }
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setScaleOpen(false);
        setThemeOpen(false);
      }
    };
    document.addEventListener("mousedown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [scaleOpen, themeOpen]);

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
    <aside className="animate-archive-in flex h-full w-full flex-col border-r border-[var(--color-void-700)] bg-void-900 lg:flex-none">
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
                  icon={<Keyboard size={15} />}
                  onClick={() => {
                    onShowShortcuts();
                    close();
                  }}
                >
                  {FLAVOUR.shortcutsTitle}
                </MenuItem>
                <MenuItem
                  icon={<KeyRound size={15} />}
                  onClick={() => {
                    onShowAgentKeys();
                    close();
                  }}
                >
                  {FLAVOUR.agentKeys}
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
            id="scry"
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={FLAVOUR.searchPlaceholder}
            aria-label={FLAVOUR.searchPlaceholder}
            className="h-10 min-w-0 flex-1 border-b border-[var(--color-void-700)] bg-transparent px-0.5 text-base text-parchment-100 outline-none transition-colors placeholder:text-parchment-500/70 focus:border-gold-500/50 sm:h-8 sm:text-sm"
          />
          <button
            type="button"
            onClick={onNew}
            aria-label={FLAVOUR.newNote}
            title={FLAVOUR.newNote}
            className="grid h-10 w-10 shrink-0 sm:h-8 sm:w-8 place-items-center rounded-lg text-parchment-500 transition-colors hover:bg-white/[0.06] hover:text-gold-300"
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
              "grid h-10 w-10 shrink-0 sm:h-8 sm:w-8 place-items-center rounded-lg transition-colors hover:bg-white/[0.06]",
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
          <ul className="space-y-0.5">
            {visible.map((note, index) => (
              <li
                key={note.id}
                className="animate-fade-in-up"
                style={{ animationDelay: `${Math.min(index, 12) * 18}ms` }}
              >
                <button
                  onClick={() => onSelect(note.id)}
                  onContextMenu={(event) =>
                    contextMenu.open(event, [
                      {
                        label: "Open page",
                        icon: <Scroll size={15} />,
                        onSelect: () => onSelect(note.id),
                      },
                      note.deleted
                        ? {
                            label: FLAVOUR.undelete,
                            icon: <Undo2 size={15} />,
                            onSelect: () => onUndelete(note.id),
                          }
                        : {
                            label: FLAVOUR.deleteConfirm,
                            icon: <Trash2 size={15} />,
                            danger: true,
                            onSelect: () => {
                              if (
                                window.confirm(
                                  `${FLAVOUR.deleteConfirm}\n\n${FLAVOUR.deleteConfirmBody}`,
                                )
                              ) {
                                onDelete(note.id);
                              }
                            },
                          },
                    ])
                  }
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
        ref={scaleRef}
        className="relative px-3 pt-1.5"
        style={{ paddingBottom: "calc(0.5rem + var(--safe-bottom))" }}
      >
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => {
              setScaleOpen((value) => !value);
              setThemeOpen(false);
            }}
            aria-expanded={scaleOpen}
            aria-label={FLAVOUR.enlarge}
            title={FLAVOUR.enlarge}
            className={cx(
              "grid h-9 w-9 place-items-center rounded-lg text-parchment-500 transition-colors hover:bg-white/[0.05] hover:text-parchment-100",
              scaleOpen && "bg-white/[0.05] text-parchment-100",
            )}
          >
            <ZoomIn size={20} aria-hidden="true" />
          </button>
          <button
            type="button"
            onClick={() => {
              setThemeOpen((value) => !value);
              setScaleOpen(false);
            }}
            aria-expanded={themeOpen}
            aria-label={FLAVOUR.themeLabel}
            title={FLAVOUR.themeLabel}
            className={cx(
              "grid h-9 w-9 place-items-center rounded-lg text-parchment-500 transition-colors hover:bg-white/[0.05] hover:text-parchment-100",
              themeOpen && "bg-white/[0.05] text-parchment-100",
            )}
          >
            <Palette size={20} aria-hidden="true" />
          </button>
        </div>

        {scaleOpen ? (
          <div className="animate-pop-in absolute bottom-full left-3 right-3 z-50 mb-2 rounded-[var(--radius-card)] border border-[var(--color-void-700)] bg-void-800 p-3 shadow-[0_20px_50px_rgba(0,0,0,0.6)]">
            <div className="flex items-center gap-2">
              <ZoomOut
                size={14}
                className="shrink-0 text-parchment-500"
                aria-hidden="true"
              />
              <input
                type="range"
                min={85}
                max={135}
                step={5}
                value={Math.round(scale * 100)}
                onChange={(event) =>
                  onScaleChange(Number(event.target.value) / 100)
                }
                aria-label={FLAVOUR.enlarge}
                className="h-1 min-w-0 flex-1 cursor-pointer accent-[var(--color-gold-400)]"
              />
              <ZoomIn
                size={14}
                className="shrink-0 text-parchment-500"
                aria-hidden="true"
              />
            </div>

            <div className="mt-3 flex items-center justify-between">
              <span className="text-[0.6875rem] tabular-nums text-parchment-500">
                {Math.round(scale * 100)}%
              </span>
              {scale !== 1 ? (
                <button
                  type="button"
                  onClick={onZoomReset}
                  className="flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[0.6875rem] text-parchment-500 transition-colors hover:bg-white/[0.06] hover:text-gold-300"
                >
                  <RotateCcw size={12} aria-hidden="true" />
                  {FLAVOUR.trueSight}
                </button>
              ) : null}
            </div>

            <div className="mt-2 grid grid-cols-3 gap-1.5">
              {(
                [
                  [0.9, FLAVOUR.scaleReduce],
                  [1, FLAVOUR.scaleDefault],
                  [1.15, FLAVOUR.scaleEnlarge],
                ] as const
              ).map(([value, label]) => (
                <Chip
                  key={label}
                  active={Math.abs(scale - value) < 0.001}
                  onClick={() => onScaleChange(value)}
                >
                  {label}
                </Chip>
              ))}
            </div>
          </div>
        ) : null}

        {themeOpen ? (
          <div className="animate-pop-in absolute bottom-full left-3 right-3 z-50 mb-2 max-h-[70dvh] overflow-y-auto rounded-[var(--radius-card)] border border-[var(--color-void-700)] bg-void-800 p-2 shadow-[0_20px_50px_rgba(0,0,0,0.6)]">
            <ThemeList activeId={themeId} onSelect={onThemeChange} />
          </div>
        ) : null}
      </footer>

      <ContextMenu state={contextMenu.state} onClose={contextMenu.close} />
    </aside>
  );
}
