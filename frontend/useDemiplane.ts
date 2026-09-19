import { useCallback, useEffect, useRef, useState } from "react";
import {
  createDraftLocal,
  db,
  discardLocal,
  purgeDrafts,
  reloadNotes,
  upsertLocalEdit,
  type LocalNote,
} from "./db/dexie";
import { api, DemiplaneError } from "./lib/api";
import {
  installSyncTriggers,
  onSyncStatus,
  runSync,
  type SyncStatus,
} from "./sync/engine";

export type AuthState = "checking" | "unauthenticated" | "authenticated";

export interface DemiplaneStore {
  auth: AuthState;
  email: string;
  notes: LocalNote[];
  activeId: string | null;
  syncStatus: SyncStatus;
  conflicts: number;
  selectNote: (id: string | null) => void;
  goBack: () => void;
  createNote: () => Promise<void>;
  saveNote: (
    id: string,
    patch: Partial<Pick<LocalNote, "title" | "body" | "folder" | "tags" | "deleted">>,
  ) => Promise<void>;
  deleteNote: (id: string) => Promise<void>;
  undeleteNote: (id: string) => Promise<void>;
  refresh: () => Promise<void>;
  logout: () => Promise<void>;
  requestLoginCode: (email: string) => Promise<{ devCode?: string }>;
  verifyLoginCode: (
    email: string,
    code: string,
    remember: boolean,
  ) => Promise<void>;
  clearConflicts: () => void;
  exportGrimoire: () => Promise<void>;
  importGrimoire: (
    file: File,
  ) => Promise<{ imported: number; conflicts: number; attachments: number }>;
}

export function useDemiplane(): DemiplaneStore {
  const [auth, setAuth] = useState<AuthState>("checking");
  const [email, setEmail] = useState("");
  const [notes, setNotes] = useState<LocalNote[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [syncStatus, setSyncStatus] = useState<SyncStatus>("idle");
  const [conflicts, setConflicts] = useState(0);

  const activeIdRef = useRef<string | null>(null);
  const draftTimer = useRef<number | null>(null);

  useEffect(() => {
    activeIdRef.current = activeId;
  }, [activeId]);

  const reload = useCallback(async () => {
    const all = await reloadNotes();
    setNotes(all);
  }, []);

  useEffect(() => onSyncStatus(setSyncStatus), []);

  const afterSync = useCallback(async () => {
    const outcome = await runSync();
    if (outcome.conflicts > 0) setConflicts((count) => count + outcome.conflicts);
    await reload();
  }, [reload]);

  /** Untouched drafts are discarded once the editor has flushed its last save. */
  const discardDraftSoon = useCallback(
    (id: string | null) => {
      if (!id) return;
      if (draftTimer.current) window.clearTimeout(draftTimer.current);
      draftTimer.current = window.setTimeout(async () => {
        const row = await db.notes.get(id);
        if (row && row.draft === 1) {
          await discardLocal(id);
          await reload();
        }
      }, 800);
    },
    [reload],
  );

  const selectNote = useCallback(
    (id: string | null) => {
      const current = activeIdRef.current;
      if (current && current !== id) discardDraftSoon(current);
      setActiveId(id);
    },
    [discardDraftSoon],
  );

  const goBack = useCallback(() => selectNote(null), [selectNote]);

  const bootstrap = useCallback(async () => {
    await purgeDrafts();
    await reload();
    try {
      const me = await api.me();
      setEmail(me.email);
      setAuth("authenticated");
      await afterSync();
    } catch (error) {
      setAuth("unauthenticated");
      if (!(error instanceof DemiplaneError)) console.error(error);
    }
  }, [afterSync, reload]);

  useEffect(() => {
    void bootstrap();
  }, [bootstrap]);

  useEffect(() => {
    if (auth !== "authenticated") return;
    return installSyncTriggers();
  }, [auth]);

  const createNote = useCallback(async () => {
    const current = activeIdRef.current;
    if (current) discardDraftSoon(current);
    const id = crypto.randomUUID();
    await createDraftLocal(id);
    await reload();
    setActiveId(id);
  }, [discardDraftSoon, reload]);

  const saveNote = useCallback<DemiplaneStore["saveNote"]>(
    async (id, patch) => {
      await upsertLocalEdit(id, patch);
      await reload();
    },
    [reload],
  );

  const deleteNote = useCallback(
    async (id: string) => {
      await upsertLocalEdit(id, { deleted: true });
      setActiveId((current) => (current === id ? null : current));
      await reload();
      void afterSync();
    },
    [afterSync, reload],
  );

  const undeleteNote = useCallback(
    async (id: string) => {
      await upsertLocalEdit(id, { deleted: false });
      await reload();
      void afterSync();
    },
    [afterSync, reload],
  );

  const refresh = useCallback(async () => {
    await afterSync();
  }, [afterSync]);

  const requestLoginCode = useCallback(async (address: string) => {
    return api.requestMagicCode(address);
  }, []);

  const verifyLoginCode = useCallback(
    async (address: string, code: string, remember: boolean) => {
      const result = await api.verifyMagicCode(address, code, remember);
      setEmail(result.email);
      setAuth("authenticated");
      await afterSync();
    },
    [afterSync],
  );

  const logout = useCallback(async () => {
    await api.logout();
    setAuth("unauthenticated");
  }, []);

  const clearConflicts = useCallback(() => setConflicts(0), []);

  const exportGrimoire = useCallback(async () => {
    const blob = await api.exportGrimoire();
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "demiplane-grimoire.zip";
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(url);
  }, []);

  const importGrimoire = useCallback(
    async (file: File) => {
      const result = await api.importGrimoire(file);
      await afterSync();
      return result;
    },
    [afterSync],
  );

  return {
    auth,
    email,
    notes,
    activeId,
    syncStatus,
    conflicts,
    selectNote,
    goBack,
    createNote,
    saveNote,
    deleteNote,
    undeleteNote,
    refresh,
    logout,
    requestLoginCode,
    verifyLoginCode,
    clearConflicts,
    exportGrimoire,
    importGrimoire,
  };
}
