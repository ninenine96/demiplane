import { useEffect, useState } from "react";
import { FLAVOUR, PLAIN } from "../../shared/messages";
import type { SyncStatus } from "../sync/engine";
import { cx } from "./ui";

/**
 * A single quiet dot in the header. The full flavour and plain status live in
 * the accessible name and title, so nothing extra occupies the canvas.
 */
export function SyncDot({
  status,
  onSync,
}: {
  status: SyncStatus;
  onSync: () => void;
}) {
  const [online, setOnline] = useState(
    typeof navigator === "undefined" ? true : navigator.onLine,
  );

  useEffect(() => {
    const update = () => setOnline(navigator.onLine);
    window.addEventListener("online", update);
    window.addEventListener("offline", update);
    return () => {
      window.removeEventListener("online", update);
      window.removeEventListener("offline", update);
    };
  }, []);

  const info = describe(status, online);
  const syncing = online && status === "syncing";

  return (
    <button
      type="button"
      onClick={onSync}
      title={info.flavour}
      aria-label={`${info.flavour} ${info.plain}`}
      className="grid h-10 w-10 shrink-0 place-items-center rounded-lg transition-colors hover:bg-white/[0.06] sm:h-8 sm:w-8"
    >
      {syncing ? (
        <span
          aria-hidden="true"
          className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-gold-500/25 border-t-gold-400"
        />
      ) : (
        <span
          aria-hidden="true"
          className={cx("h-2 w-2 rounded-full", info.dot)}
        />
      )}
      <span className="sr-only" role="status" aria-live="polite">
        {info.plain}
      </span>
    </button>
  );
}

function describe(
  status: SyncStatus,
  online: boolean,
): { flavour: string; plain: string; dot: string } {
  if (!online) {
    return {
      flavour: FLAVOUR.offline,
      plain: PLAIN.offline,
      dot: "bg-parchment-500/50",
    };
  }
  switch (status) {
    case "syncing":
      return {
        flavour: FLAVOUR.syncInProgress,
        plain: PLAIN.syncing,
        dot: "animate-pulse bg-gold-400",
      };
    case "error":
      return {
        flavour: FLAVOUR.syncFailed,
        plain: PLAIN.syncError,
        dot: "bg-ember-400",
      };
    case "synced":
      return {
        flavour: FLAVOUR.syncDone,
        plain: PLAIN.synced,
        dot: "bg-sage-400",
      };
    default:
      return {
        flavour: PLAIN.idle,
        plain: PLAIN.idle,
        dot: "bg-parchment-500/50",
      };
  }
}
