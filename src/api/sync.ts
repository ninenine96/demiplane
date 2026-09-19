import type {
  SyncChange,
  SyncPullResponse,
  SyncPushItem,
  SyncPushResponse,
  SyncPushResult,
} from "../../shared/types";
import { getNoteById, applySyncItem } from "./notes";

const MAX_PULL_NOTES = 200;

/**
 * Returns every note touched since the client's cursor, at its current state.
 * Using the monotonic `change_log.seq` means we never rely on client clocks.
 */
export async function handleSyncPull(
  env: Env,
  since: number,
): Promise<Response> {
  const { results } = await env.DB.prepare(
    `SELECT note_id, MAX(seq) AS seq
     FROM change_log
     WHERE seq > ?1
     GROUP BY note_id
     ORDER BY seq ASC
     LIMIT ?2`,
  )
    .bind(since, MAX_PULL_NOTES)
    .all<{ note_id: string; seq: number }>();

  const rows = results ?? [];
  const changes: SyncChange[] = [];
  let cursor = since;

  for (const row of rows) {
    const note = await getNoteById(env, row.note_id);
    if (note) {
      changes.push({
        seq: row.seq,
        note,
        op: note.deleted ? "delete" : "upsert",
      });
    }
    cursor = Math.max(cursor, row.seq);
  }

  const payload: SyncPullResponse = {
    changes,
    cursor,
    serverTime: Date.now(),
  };
  return Response.json(payload);
}

export async function handleSyncPush(
  env: Env,
  items: SyncPushItem[],
): Promise<Response> {
  const results: SyncPushResult[] = [];
  for (const item of items) {
    results.push(await applySyncItem(env, item));
  }

  const cursorRow = await env.DB.prepare(
    "SELECT COALESCE(MAX(seq), 0) AS cursor FROM change_log",
  ).first<{ cursor: number }>();

  const payload: SyncPushResponse = {
    results,
    cursor: cursorRow?.cursor ?? 0,
  };
  return Response.json(payload);
}
