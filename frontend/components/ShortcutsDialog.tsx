import { useEffect } from "react";
import { X } from "lucide-react";
import { FLAVOUR } from "../../shared/messages";
import { SHORTCUTS, formatKeys } from "../lib/shortcuts";

export function ShortcutsDialog({ onClose }: { onClose: () => void }) {
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  const groups = [...new Set(SHORTCUTS.map((shortcut) => shortcut.group))];

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={FLAVOUR.shortcutsTitle}
      onMouseDown={onClose}
      className="animate-fade-in-up fixed inset-0 z-[60] grid place-items-center bg-black/55 p-4 backdrop-blur-sm"
    >
      <div
        onMouseDown={(event) => event.stopPropagation()}
        className="animate-pop-in w-full max-w-md rounded-[var(--radius-card)] border border-[var(--color-void-700)] border-t-gold-500/40 bg-void-900 p-5 shadow-[0_24px_60px_rgba(0,0,0,0.6)]"
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-base font-semibold text-gold-300">
              {FLAVOUR.shortcutsTitle}
            </h2>
            <p className="mt-1 text-xs text-parchment-500">
              {FLAVOUR.shortcutsHint}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="grid h-8 w-8 place-items-center rounded-lg text-parchment-500 transition-colors hover:bg-white/[0.06] hover:text-parchment-100"
          >
            <X size={16} aria-hidden="true" />
          </button>
        </div>

        <div className="mt-5 space-y-5">
          {groups.map((group) => (
            <section key={group}>
              <p className="text-[0.625rem] uppercase tracking-[0.18em] text-parchment-500">
                {group}
              </p>
              <ul className="mt-2 space-y-1.5">
                {SHORTCUTS.filter((shortcut) => shortcut.group === group).map(
                  (shortcut) => (
                    <li
                      key={`${shortcut.keys}-${shortcut.label}`}
                      className="flex items-center justify-between gap-4 text-sm"
                    >
                      <span className="text-parchment-300">
                        {shortcut.label}
                      </span>
                      <kbd className="rounded border border-[var(--color-void-600)] bg-void-950/70 px-2 py-0.5 font-mono text-[0.6875rem] text-parchment-100">
                        {formatKeys(shortcut.keys)}
                      </kbd>
                    </li>
                  ),
                )}
              </ul>
            </section>
          ))}
        </div>
      </div>
    </div>
  );
}
