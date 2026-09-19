import { useCallback, useEffect, useState } from "react";
import { ChevronsRight } from "lucide-react";
import { FLAVOUR, PLAIN } from "../shared/messages";
import { AuthScreen } from "./components/AuthScreen";
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
const SCALE_STEP = 0.05;

function initialScale(): number {
  if (typeof window === "undefined") return 1;
  const raw = Number(window.localStorage.getItem("demiplane.scale"));
  return Number.isFinite(raw) && raw >= MIN_SCALE && raw <= MAX_SCALE ? raw : 1;
}

function clampScale(value: number): number {
  return Math.min(MAX_SCALE, Math.max(MIN_SCALE, Number(value.toFixed(2))));
}

export function App() {
  const store = useDemiplane();
  const [notice, setNotice] = useState<string | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(initialSidebarState);
  const [scale, setScale] = useState(initialScale);
  const [showShortcuts, setShowShortcuts] = useState(false);

  useEffect(() => {
    window.localStorage.setItem(
      "demiplane.sidebar",
      sidebarOpen ? "open" : "closed",
    );
  }, [sidebarOpen]);

  useEffect(() => {
    document.documentElement.style.setProperty("--ui-scale", String(scale));
    window.localStorage.setItem("demiplane.scale", String(scale));
  }, [scale]);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      const mod = event.metaKey || event.ctrlKey;
      const target = event.target as HTMLElement | null;
      const typing =
        target?.tagName === "INPUT" ||
        target?.tagName === "TEXTAREA" ||
        target?.isContentEditable === true;

      if (mod && event.key.toLowerCase() === "s") {
        event.preventDefault();
        return;
      }
      if (mod && event.key === "\\") {
        event.preventDefault();
        setSidebarOpen((value) => !value);
        return;
      }
      if (mod && event.key.toLowerCase() === "n") {
        event.preventDefault();
        void store.createNote();
        return;
      }
      if (!typing && (event.key === "?" || (mod && event.key === "/"))) {
        event.preventDefault();
        setShowShortcuts((value) => !value);
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [store]);

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
          "archive-shell h-full w-full lg:flex-none",
          showEditor ? "hidden lg:flex" : "flex",
        )}
        data-open={sidebarOpen ? "true" : "false"}
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
          canZoomIn={scale < MAX_SCALE}
          canZoomOut={scale > MIN_SCALE}
          onZoomIn={() => setScale((value) => clampScale(value + SCALE_STEP))}
          onZoomOut={() => setScale((value) => clampScale(value - SCALE_STEP))}
          onZoomReset={() => setScale(1)}
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
          syncStatus={store.syncStatus}
          onSave={store.saveNote}
          onDelete={store.deleteNote}
          onUndelete={store.undeleteNote}
          onSync={() => void store.refresh()}
          onBack={store.goBack}
          onNew={() => void store.createNote()}
        />
      </main>

      {showShortcuts ? (
        <ShortcutsDialog onClose={() => setShowShortcuts(false)} />
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
