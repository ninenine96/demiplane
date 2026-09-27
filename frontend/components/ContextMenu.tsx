import { useEffect, useState, type MouseEvent, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { cx } from "./ui";

export interface ContextMenuItem {
  label: string;
  icon?: ReactNode;
  danger?: boolean;
  disabled?: boolean;
  onSelect?: () => void;
}

export interface ContextMenuHeading {
  heading: string;
}

export interface ContextMenuSeparator {
  separator: true;
}

export type ContextMenuEntry =
  | ContextMenuItem
  | ContextMenuHeading
  | ContextMenuSeparator;

interface MenuState {
  x: number;
  y: number;
  items: ContextMenuEntry[];
}

/** Right-click menus, positioned at the cursor and clamped to the viewport. */
export function useContextMenu() {
  const [state, setState] = useState<MenuState | null>(null);

  function open(event: MouseEvent, items: ContextMenuEntry[]) {
    if (items.length === 0) return;
    event.preventDefault();
    event.stopPropagation();
    setState({ x: event.clientX, y: event.clientY, items });
  }

  function close() {
    setState(null);
  }

  return { open, close, state };
}

function entryHeight(entry: ContextMenuEntry): number {
  if ("separator" in entry) return 9;
  if ("heading" in entry) return 24;
  return 38;
}

export function ContextMenu({
  state,
  onClose,
}: {
  state: MenuState | null;
  onClose: () => void;
}) {
  useEffect(() => {
    if (!state) return;
    const dismiss = () => onClose();
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("mousedown", dismiss);
    window.addEventListener("contextmenu", dismiss, true);
    window.addEventListener("keydown", onKey);
    window.addEventListener("resize", dismiss);
    window.addEventListener("scroll", dismiss, true);
    return () => {
      window.removeEventListener("mousedown", dismiss);
      window.removeEventListener("contextmenu", dismiss, true);
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("resize", dismiss);
      window.removeEventListener("scroll", dismiss, true);
    };
  }, [state, onClose]);

  if (!state) return null;

  const width = 224;
  const height =
    state.items.reduce((sum, entry) => sum + entryHeight(entry), 0) + 12;
  const x = Math.max(8, Math.min(state.x, window.innerWidth - width - 8));
  const y = Math.max(8, Math.min(state.y, window.innerHeight - height - 8));

  return createPortal(
    <div
      role="menu"
      aria-label="Context menu"
      onMouseDown={(event) => event.stopPropagation()}
      onContextMenu={(event) => event.preventDefault()}
      style={{ left: x, top: y, width, transformOrigin: "top left" }}
      className="animate-pop-in fixed z-[70] rounded-[var(--radius-card)] border border-[var(--color-void-700)] bg-void-800 p-1.5 shadow-[0_20px_50px_rgba(0,0,0,0.6)]"
    >
      {state.items.map((entry, index) => {
        if ("separator" in entry) {
          return (
            <div
              key={`separator-${index}`}
              role="separator"
              className="my-1 h-px bg-[var(--color-void-700)]"
            />
          );
        }
        if ("heading" in entry) {
          return (
            <div
              key={`heading-${index}`}
              className="px-3 pb-1 pt-1.5 text-[0.625rem] uppercase tracking-[0.18em] text-parchment-500"
            >
              {entry.heading}
            </div>
          );
        }
        return (
          <button
            key={`item-${index}`}
            type="button"
            role="menuitem"
            disabled={entry.disabled}
            onClick={() => {
              if (entry.disabled) return;
              entry.onSelect?.();
              onClose();
            }}
            className={cx(
              "flex w-full items-center gap-2.5 whitespace-nowrap rounded-lg px-3 py-2 text-left text-sm transition-colors disabled:pointer-events-none disabled:opacity-60",
              entry.danger
                ? "text-ember-400 hover:bg-ember-400/10"
                : "text-parchment-300 hover:bg-white/[0.06] hover:text-parchment-100",
            )}
          >
            {entry.icon ? (
              <span aria-hidden="true" className="shrink-0 text-parchment-500">
                {entry.icon}
              </span>
            ) : null}
            {entry.label}
          </button>
        );
      })}
    </div>,
    document.body,
  );
}
