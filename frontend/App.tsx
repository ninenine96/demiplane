import { useCallback, useEffect, useState } from "react";
import { FLAVOUR, PLAIN } from "../shared/messages";
import { AuthScreen } from "./components/AuthScreen";
import { EditorPane } from "./components/EditorPane";
import { Sidebar } from "./components/Sidebar";
import { StatusLine } from "./components/ui";
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
    async (token: string) => {
      await store.confirmMagicLink(token);
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
      <main className="flex min-h-full items-center justify-center">
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

  return (
    <div className="flex h-full flex-col lg:flex-row">
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
      <main className="min-h-0 flex-1">
        <EditorPane
          note={active}
          onSave={store.saveNote}
          onDelete={store.deleteNote}
          onUndelete={store.undeleteNote}
        />
      </main>

      {store.conflicts > 0 ? (
        <div
          role="status"
          className="fixed bottom-4 right-4 max-w-sm rounded-xl border border-gold-500/40 bg-void-800/95 p-4 shadow-2xl backdrop-blur"
        >
          <StatusLine
            flavour={FLAVOUR.conflict}
            plain={`${store.conflicts} note(s) kept as conflict copies.`}
            tone="success"
          />
          <button
            onClick={store.clearConflicts}
            className="mt-2 text-xs text-parchment-500 hover:text-parchment-100"
          >
            Dismiss
          </button>
        </div>
      ) : null}

      {notice ? (
        <div
          role="status"
          aria-live="polite"
          className="fixed bottom-4 left-4 max-w-sm rounded-xl border border-arcane-500/40 bg-void-800/95 p-4 text-sm shadow-2xl backdrop-blur"
        >
          <p className="text-parchment-100">{notice}</p>
          <button
            onClick={() => setNotice(null)}
            className="mt-2 text-xs text-parchment-500 hover:text-parchment-100"
          >
            Dismiss
          </button>
        </div>
      ) : null}
    </div>
  );
}
