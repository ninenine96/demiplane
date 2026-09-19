import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type CSSProperties,
  type PointerEvent as ReactPointerEvent,
} from "react";
import {
  AlignCenter,
  ChevronsRight,
  Download,
  Focus,
  Keyboard,
  LogOut,
  PanelLeft,
  Plus,
  RefreshCw,
  RotateCcw,
  Search,
} from "lucide-react";
import { FLAVOUR, PLAIN } from "../shared/messages";
import { AuthScreen } from "./components/AuthScreen";
import {
  CommandPalette,
  type PaletteCommand,
} from "./components/CommandPalette";
import { EditorPane } from "./components/EditorPane";
import { ShortcutsDialog } from "./components/ShortcutsDialog";
import { Sidebar } from "./components/Sidebar";
import { cx, StatusLine } from "./components/ui";
import { useDemiplane } from "./useDemiplane";

function initialSidebarState(): boolean {
  if (typeof window === "undefined") return true;
  return window.localStorage.getItem("demiplane.sidebar") !== "closed";
}

const MIN_SCALE = 0.85;
const MAX_SCALE = 1.35;

const MIN_SIDEBAR = 220;
const MAX_SIDEBAR = 460;
const DEFAULT_SIDEBAR = 288;

function initialScale(): number {
  if (typeof window === "undefined") return 1;
  const raw = Number(window.localStorage.getItem("demiplane.scale"));
  return Number.isFinite(raw) && raw >= MIN_SCALE && raw <= MAX_SCALE ? raw : 1;
}

function clampScale(value: number): number {
  return Math.min(MAX_SCALE, Math.max(MIN_SCALE, Number(value.toFixed(2))));
}

function initialSidebarWidth(): number {
  if (typeof window === "undefined") return DEFAULT_SIDEBAR;
  const raw = Number(window.localStorage.getItem("demiplane.sidebarWidth"));
  return Number.isFinite(raw) && raw >= MIN_SIDEBAR && raw <= MAX_SIDEBAR
    ? raw
    : DEFAULT_SIDEBAR;
}

export function App() {
  const store = useDemiplane();
  const [notice, setNotice] = useState<string | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(initialSidebarState);
  const [sidebarWidth, setSidebarWidth] = useState(initialSidebarWidth);
  const [scale, setScale] = useState(initialScale);
  const [showShortcuts, setShowShortcuts] = useState(false);
  const [showPalette, setShowPalette] = useState(false);
  const [focusMode, setFocusMode] = useState(false);
  const [typewriterMode, setTypewriterMode] = useState(false);

  useEffect(() => {
    window.localStorage.setItem(
      "demiplane.sidebar",
      sidebarOpen ? "open" : "closed",
    );
  }, [sidebarOpen]);

  useEffect(() => {
    window.localStorage.setItem(
      "demiplane.sidebarWidth",
      String(sidebarWidth),
    );
  }, [sidebarWidth]);

  useEffect(() => {
    document.documentElement.style.setProperty("--ui-scale", String(scale));
    window.localStorage.setItem("demiplane.scale", String(scale));
  }, [scale]);

  const focusScry = useCallback(() => {
    setSidebarOpen(true);
    requestAnimationFrame(() => document.getElementById("scry")?.focus());
  }, []);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.defaultPrevented) return;
      if (showShortcuts || showPalette) return;

      const mod = event.metaKey || event.ctrlKey;
      const target = event.target as HTMLElement | null;
      const typing =
        target?.tagName === "INPUT" ||
        target?.tagName === "TEXTAREA" ||
        target?.isContentEditable === true;
      const key = event.key.toLowerCase();

      if (mod && key === "s") {
        event.preventDefault();
        return;
      }
      if (mod && key === "p") {
        event.preventDefault();
        setShowPalette(true);
        return;
      }
      if (mod && event.shiftKey && key === "f") {
        event.preventDefault();
        setFocusMode((value) => !value);
        return;
      }
      // VSCode-style: fold the archive. The editor overrides this to bold.
      if (mod && key === "b") {
        event.preventDefault();
        setSidebarOpen((value) => !value);
        return;
      }
      if (mod && event.key === "\\") {
        event.preventDefault();
        setSidebarOpen((value) => !value);
        return;
      }
      if (mod && key === "n") {
        event.preventDefault();
        void store.createNote();
        return;
      }
      // Find: the editor overrides this to forge a link.
      if (mod && key === "k") {
        event.preventDefault();
        focusScry();
        return;
      }
      if (event.key === "Escape" && store.activeId) {
        if (window.matchMedia("(max-width: 1023px)").matches) {
          store.goBack();
        }
        return;
      }
      if (!typing && (event.key === "?" || (mod && event.key === "/"))) {
        event.preventDefault();
        setShowShortcuts(true);
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [store, showShortcuts, showPalette, focusScry]);

  const startResize = useCallback(
    (event: ReactPointerEvent<HTMLDivElement>) => {
      event.preventDefault();
      const startX = event.clientX;
      const startWidth = sidebarWidth;
      const move = (moveEvent: PointerEvent) => {
        setSidebarWidth(
          Math.min(
            MAX_SIDEBAR,
            Math.max(MIN_SIDEBAR, startWidth + (moveEvent.clientX - startX)),
          ),
        );
      };
      const stop = () => {
        window.removeEventListener("pointermove", move);
        window.removeEventListener("pointerup", stop);
        document.body.style.userSelect = "";
      };
      document.body.style.userSelect = "none";
      window.addEventListener("pointermove", move);
      window.addEventListener("pointerup", stop);
    },
    [sidebarWidth],
  );

  const handleExport = useCallback(async () => {
    try {
      await store.exportGrimoire();
      setNotice(FLAVOUR.exportDone);
    } catch {
      setNotice(FLAVOUR.errorGeneric);
    }
  }, [store]);

  const handleImport = useCallback(
    async (file: File) => {
      try {
        const result = await store.importGrimoire(file);
        setNotice(
          `${result.imported} page(s) folded in` +
            (result.conflicts ? `, ${result.conflicts} kept as conflicts` : "") +
            ".",
        );
      } catch {
        setNotice(FLAVOUR.errorGeneric);
      }
    },
    [store],
  );

  const paletteCommands = useMemo<PaletteCommand[]>(
    () => [
      {
        id: "new",
        label: FLAVOUR.newNote,
        group: FLAVOUR.paletteWorkings,
        icon: <Plus size={15} />,
        run: () => void store.createNote(),
      },
      {
        id: "find",
        label: FLAVOUR.searchPlaceholder,
        group: FLAVOUR.paletteWorkings,
        icon: <Search size={15} />,
        run: focusScry,
      },
      {
        id: "archive",
        label: FLAVOUR.archiveToggle,
        group: FLAVOUR.paletteWorkings,
        icon: <PanelLeft size={15} />,
        run: () => setSidebarOpen((value) => !value),
      },
      {
        id: "focus",
        label: FLAVOUR.focusMode,
        group: FLAVOUR.paletteWorkings,
        icon: <Focus size={15} />,
        run: () => setFocusMode((value) => !value),
      },
      {
        id: "typewriter",
        label: FLAVOUR.typewriterMode,
        group: FLAVOUR.paletteWorkings,
        icon: <AlignCenter size={15} />,
        run: () => setTypewriterMode((value) => !value),
      },
      {
        id: "sync",
        label: FLAVOUR.syncNow,
        group: FLAVOUR.paletteWorkings,
        icon: <RefreshCw size={15} />,
        run: () => void store.refresh(),
      },
      {
        id: "export",
        label: FLAVOUR.export,
        group: FLAVOUR.paletteWorkings,
        icon: <Download size={15} />,
        run: () => void handleExport(),
      },
      {
        id: "scale-reset",
        label: FLAVOUR.trueSight,
        group: FLAVOUR.paletteWorkings,
        icon: <RotateCcw size={15} />,
        run: () => setScale(1),
      },
      {
        id: "shortcuts",
        label: FLAVOUR.shortcutsTitle,
        group: FLAVOUR.paletteWorkings,
        icon: <Keyboard size={15} />,
        run: () => setShowShortcuts(true),
      },
      {
        id: "logout",
        label: FLAVOUR.logout,
        group: FLAVOUR.paletteWorkings,
        icon: <LogOut size={15} />,
        run: () => void store.logout(),
      },
    ],
    [store, focusScry, handleExport],
  );

  if (store.auth === "checking") {
    return (
      <main className="flex min-h-[100dvh] items-center justify-center">
        <StatusLine flavour={FLAVOUR.loading} plain={PLAIN.loadingNotes} />
      </main>
    );
  }

  if (store.auth === "unauthenticated") {
    return (
      <AuthScreen
        requestCode={store.requestLoginCode}
        verifyCode={store.verifyLoginCode}
      />
    );
  }

  const active = store.notes.find((note) => note.id === store.activeId);
  const showEditor = Boolean(active);

  return (
    <div className="flex h-[100dvh] overflow-hidden">
      <div
        className={cx(
          "archive-shell relative h-full w-full lg:flex-none",
          showEditor ? "hidden lg:flex" : "flex",
        )}
        data-open={sidebarOpen ? "true" : "false"}
        style={{ "--archive-width": `${sidebarWidth}px` } as CSSProperties}
      >
        <Sidebar
          notes={store.notes}
          activeId={store.activeId}
          email={store.email}
          onSelect={store.selectNote}
          onNew={() => void store.createNote()}
          onSync={() => void store.refresh()}
          onLogout={() => void store.logout()}
          onExport={() => void handleExport()}
          onImport={(file) => void handleImport(file)}
          onCollapse={() => setSidebarOpen(false)}
          onShowShortcuts={() => setShowShortcuts(true)}
          onDelete={(id) => void store.deleteNote(id)}
          onUndelete={(id) => void store.undeleteNote(id)}
          scale={scale}
          onScaleChange={(value) => setScale(clampScale(value))}
          onZoomReset={() => setScale(1)}
        />
        <div
          role="separator"
          aria-orientation="vertical"
          aria-label="Resize the archive"
          onPointerDown={startResize}
          className="absolute right-0 top-0 z-20 hidden h-full w-1.5 cursor-col-resize touch-none transition-colors hover:bg-gold-400/30 lg:block"
        />
      </div>

      {!sidebarOpen ? (
        <button
          type="button"
          onClick={() => setSidebarOpen(true)}
          aria-label="Summon the archive"
          title="Summon the archive"
          className="animate-fade-in-up fixed left-0 top-1/2 z-30 hidden h-16 w-5 -translate-y-1/2 place-items-center rounded-r-lg border border-l-0 border-[var(--color-void-700)] bg-void-900 text-parchment-500 transition-colors hover:text-gold-300 lg:grid"
        >
          <ChevronsRight size={15} aria-hidden="true" />
        </button>
      ) : null}

      <main
        className={cx(
          "editor-shell min-h-0 min-w-0 flex-1",
          showEditor ? "block" : "hidden lg:block",
        )}
      >
        <EditorPane
          note={active}
          notes={store.notes}
          syncStatus={store.syncStatus}
          focusMode={focusMode}
          typewriterMode={typewriterMode}
          onSave={store.saveNote}
          onDelete={store.deleteNote}
          onUndelete={store.undeleteNote}
          onSync={() => void store.refresh()}
          onBack={store.goBack}
          onNew={() => void store.createNote()}
          onSelectNote={store.selectNote}
        />
      </main>

      {showShortcuts ? (
        <ShortcutsDialog onClose={() => setShowShortcuts(false)} />
      ) : null}

      {showPalette ? (
        <CommandPalette
          commands={paletteCommands}
          notes={store.notes}
          onSelectNote={store.selectNote}
          onClose={() => setShowPalette(false)}
        />
      ) : null}

      <div
        className="pointer-events-none fixed inset-x-0 z-50 flex flex-col items-center gap-3 px-4"
        style={{ bottom: "calc(1rem + var(--safe-bottom))" }}
      >
        {store.conflicts > 0 ? (
          <Toast
            tone="success"
            flavour={FLAVOUR.conflict}
            plain={`${store.conflicts} note(s) kept as conflict copies.`}
            onDismiss={store.clearConflicts}
          />
        ) : null}
        {notice ? (
          <Toast
            tone="neutral"
            flavour={notice}
            onDismiss={() => setNotice(null)}
          />
        ) : null}
      </div>
    </div>
  );
}

function Toast({
  flavour,
  plain,
  tone,
  onDismiss,
}: {
  flavour: string;
  plain?: string;
  tone: "neutral" | "success";
  onDismiss: () => void;
}) {
  const [leaving, setLeaving] = useState(false);

  function dismiss() {
    if (leaving) return;
    setLeaving(true);
    window.setTimeout(onDismiss, 200);
  }

  return (
    <div
      role="status"
      aria-live="polite"
      className={cx(
        "pointer-events-auto w-full max-w-sm rounded-[var(--radius-card)] border border-[var(--color-void-700)] bg-void-800 p-4 shadow-[0_16px_40px_rgba(0,0,0,0.5)]",
        leaving ? "animate-toast-out" : "animate-toast-in",
      )}
    >
      <StatusLine flavour={flavour} plain={plain} tone={tone} />
      <button
        onClick={dismiss}
        className="mt-3 text-xs text-parchment-500 transition-colors hover:text-parchment-100"
      >
        Dismiss
      </button>
    </div>
  );
}
