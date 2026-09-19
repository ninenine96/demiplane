import { useCallback, useEffect, useState } from "react";
import { FLAVOUR } from "../shared/messages";
import { db, upsertLocalEdit, type LocalNote } from "./db/dexie";
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
  setActiveId: (id: string | null) => void;
  createNote: () => Promise<void>;
  saveNote: (
    id: string,
    patch: Partial<Pick<LocalNote, "title" | "body" | "folder" | "tags" | "deleted">>,
  ) => Promise<void>;
  deleteNote: (id: string) => Promise<void>;
  undeleteNote: (id: string) => Promise<void>;
  refresh: () => Promise<void>;
  logout: () => Promise<void>;
  submitMagicLink: (email: string) => Promise<{ devLink?: string }>;
  confirmMagicLink: (token: string, remember: boolean) => Promise<void>;
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

  const reload = useCallback(async () => {
    const all = await db.notes.toArray();
    all.sort((a, b) => b.updatedAt - a.updatedAt);
    setNotes(all);
  }, []);

  useEffect(() => onSyncStatus(setSyncStatus), []);

  const afterSync = useCallback(async () => {
    const outcome = await runSync();
    if (outcome.conflicts > 0) setConflicts((count) => count + outcome.conflicts);
    await reload();
  }, [reload]);

  const bootstrap = useCallback(async () => {
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
  }, [auth, afterSync]);

  const createNote = useCallback(async () => {
    const id = crypto.randomUUID();
    await upsertLocalEdit(id, { title: FLAVOUR.unnamedNote, body: "" });
    await reload();
    setActiveId(id);
    void afterSync();
  }, [afterSync, reload]);

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

  const submitMagicLink = useCallback(async (address: string) => {
    return api.requestMagicLink(address);
  }, []);

  const confirmMagicLink = useCallback(
    async (token: string, remember: boolean) => {
      const result = await api.verifyMagicLink(token, remember);
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
    setActiveId,
    createNote,
    saveNote,
    deleteNote,
    undeleteNote,
    refresh,
    logout,
    submitMagicLink,
    confirmMagicLink,
    clearConflicts,
    exportGrimoire,
    importGrimoire,
  };
}
