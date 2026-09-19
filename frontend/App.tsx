import { useCallback, useEffect, useState } from "react";
import { FLAVOUR, PLAIN } from "../shared/messages";
import { AuthScreen } from "./components/AuthScreen";
import { EditorPane } from "./components/EditorPane";
import { Sidebar } from "./components/Sidebar";
import { cx, StatusLine } from "./components/ui";
import { useDemiplane } from "./useDemiplane";

function readLoginToken(): string | null {
  const params = new URLSearchParams(window.location.search);
  return params.get("login");
}

export function App() {
  const store = useDemiplane();
  const [pendingToken, setPendingToken] = useState<string | null>(readLoginToken);
  const [notice, setNotice] = useState<string | null>(null);

  const clearToken = useCallback(() => {
    setPendingToken(null);
    const url = new URL(window.location.href);
    url.searchParams.delete("login");
    window.history.replaceState({}, "", url.toString());
  }, []);

  useEffect(() => {
    if (store.auth === "authenticated" && pendingToken) clearToken();
  }, [store.auth, pendingToken, clearToken]);

  const confirmMagicLink = useCallback(
    async (token: string, remember: boolean) => {
      await store.confirmMagicLink(token, remember);
      clearToken();
    },
    [store, clearToken],
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
        pendingToken={pendingToken}
        onSubmit={store.submitMagicLink}
        onConfirm={confirmMagicLink}
      />
    );
  }

  const active = store.notes.find((note) => note.id === store.activeId);
  const showEditor = Boolean(active);

  return (
    <div className="flex h-[100dvh] overflow-hidden">
      <div
        className={cx(
          "h-full w-full lg:flex lg:w-80 lg:flex-none",
          showEditor ? "hidden" : "block",
        )}
      >
        <Sidebar
          notes={store.notes}
          activeId={store.activeId}
          email={store.email}
          syncStatus={store.syncStatus}
          onSelect={store.setActiveId}
          onNew={() => void store.createNote()}
          onSync={() => void store.refresh()}
          onLogout={() => void store.logout()}
          onExport={() => void handleExport()}
          onImport={(file) => void handleImport(file)}
        />
      </div>

      <main
        className={cx(
          "min-h-0 min-w-0 flex-1",
          showEditor ? "block" : "hidden lg:block",
        )}
      >
        <EditorPane
          note={active}
          onSave={store.saveNote}
          onDelete={store.deleteNote}
          onUndelete={store.undeleteNote}
          onBack={() => store.setActiveId(null)}
          onNew={() => void store.createNote()}
        />
      </main>

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
  return (
    <div
      role="status"
      aria-live="polite"
      className="pointer-events-auto w-full max-w-sm rounded-[var(--radius-card)] border border-[var(--color-void-700)] bg-void-800 p-4 shadow-[0_16px_40px_rgba(0,0,0,0.5)]"
    >
      <StatusLine flavour={flavour} plain={plain} tone={tone} />
      <button
        onClick={onDismiss}
        className="mt-3 text-xs text-parchment-500 transition-colors hover:text-parchment-100"
      >
        Dismiss
      </button>
    </div>
  );
}
