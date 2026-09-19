import { useEffect, useState } from "react";
import { RefreshCw } from "lucide-react";
import { FLAVOUR, PLAIN } from "../../shared/messages";
import type { SyncStatus } from "../sync/engine";

export function SyncBadge({
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
  const dot = {
    neutral: "bg-parchment-500",
    error: "bg-ember-400",
    success: "bg-sage-400",
    active: "bg-gold-400 animate-pulse",
  }[info.dot];

  return (
    <div className="flex items-center gap-2 text-xs">
      <span
        aria-hidden="true"
        className={`h-2 w-2 flex-none rounded-full ${dot}`}
      />
      <span className={info.tone} title={info.plain}>
        {info.flavour}
      </span>
      <span className="sr-only" role="status" aria-live="polite">
        {info.plain}
      </span>
      <button
        onClick={onSync}
        className="ml-auto rounded-md px-2 py-1 text-parchment-500 transition-colors hover:bg-white/5 hover:text-gold-300"
        aria-label={FLAVOUR.syncNow}
      >
        <RefreshCw size={14} aria-hidden="true" />
      </button>
    </div>
  );
}

function describe(
  status: SyncStatus,
  online: boolean,
): { flavour: string; plain: string; tone: string; dot: string } {
  if (!online) {
    return {
      flavour: FLAVOUR.offline,
      plain: PLAIN.offline,
      tone: "text-parchment-500",
      dot: "neutral",
    };
  }
  switch (status) {
    case "syncing":
      return {
        flavour: FLAVOUR.syncInProgress,
        plain: PLAIN.syncing,
        tone: "text-arcane-300",
        dot: "active",
      };
    case "error":
      return {
        flavour: FLAVOUR.syncFailed,
        plain: PLAIN.syncError,
        tone: "text-ember-400",
        dot: "error",
      };
    case "synced":
      return {
        flavour: FLAVOUR.syncDone,
        plain: PLAIN.synced,
        tone: "text-gold-300",
        dot: "success",
      };
    default:
      return {
        flavour: PLAIN.idle,
        plain: PLAIN.idle,
        tone: "text-parchment-500",
        dot: "neutral",
      };
  }
}
