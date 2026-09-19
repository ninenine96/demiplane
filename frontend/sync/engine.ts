import { api, DemiplaneError } from "../lib/api";
import {
  applyServerChange,
  db,
  getMeta,
  setMeta,
  toPushItem,
} from "../db/dexie";

export type SyncStatus = "idle" | "syncing" | "synced" | "offline" | "error";

export interface SyncOutcome {
  ok: boolean;
  status: SyncStatus;
  pushed: number;
  pulled: number;
  conflicts: number;
}

type Listener = (status: SyncStatus) => void;

const listeners = new Set<Listener>();
let currentStatus: SyncStatus = "idle";
let inFlight: Promise<SyncOutcome> | null = null;

export function onSyncStatus(listener: Listener): () => void {
  listeners.add(listener);
  listener(currentStatus);
  return () => listeners.delete(listener);
}

function setStatus(status: SyncStatus): void {
  currentStatus = status;
  for (const listener of listeners) listener(status);
}

/** Pushes local edits, then pulls remote changes. Never runs concurrently. */
export function runSync(): Promise<SyncOutcome> {
  if (inFlight) return inFlight;
  inFlight = performSync().finally(() => {
    inFlight = null;
  });
  return inFlight;
}

async function performSync(): Promise<SyncOutcome> {
  setStatus("syncing");
  let pushed = 0;
  let conflicts = 0;
  try {
    const dirty = await db.notes.where("dirty").equals(1).toArray();
    if (dirty.length > 0) {
      const response = await api.syncPush(dirty.map(toPushItem));
      for (const result of response.results) {
        const local = await db.notes.get(result.id);
        if (!local) continue;
        if (result.status === "conflict") conflicts += 1;
        await db.notes.put({
          ...local,
          version: result.version,
          baseVersion: result.version,
          updatedAt: result.updatedAt,
          dirty: 0,
        });
        pushed += 1;
      }
    }

    const since = Number(await getMeta("lastSeq", "0"));
    const pull = await api.syncPull(Number.isFinite(since) ? since : 0);
    for (const change of pull.changes) {
      await applyServerChange(change);
    }
    await setMeta("lastSeq", String(pull.cursor));

    setStatus("synced");
    return { ok: true, status: "synced", pushed, pulled: pull.changes.length, conflicts };
  } catch (error) {
    if (error instanceof DemiplaneError && error.status === 401) {
      setStatus("error");
      return { ok: false, status: "error", pushed, pulled: 0, conflicts };
    }
    if (error instanceof DemiplaneError && error.status !== 0) {
      setStatus("error");
      return { ok: false, status: "error", pushed, pulled: 0, conflicts };
    }
    setStatus("offline");
    return { ok: false, status: "offline", pushed, pulled: 0, conflicts };
  }
}

/** Wires browser events that should trigger a sync. */
export function installSyncTriggers(): () => void {
  const onOnline = () => void runSync();
  const onVisible = () => {
    if (document.visibilityState === "visible") void runSync();
  };
  window.addEventListener("online", onOnline);
  document.addEventListener("visibilitychange", onVisible);
  const interval = window.setInterval(() => void runSync(), 60_000);

  return () => {
    window.removeEventListener("online", onOnline);
    document.removeEventListener("visibilitychange", onVisible);
    window.clearInterval(interval);
  };
}
