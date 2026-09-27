import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type MouseEvent,
  type ReactNode,
} from "react";
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

export function ContextMenu({
  state,
  onClose,
}: {
  state: MenuState | null;
  onClose: () => void;
}) {
  const panelRef = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState<{
    state: MenuState;
    left: number;
    top: number;
  } | null>(null);

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

  // Measure the real box, then clamp it to the viewport so long labels or a
  // large UI scale can never push the menu off-screen.
  useLayoutEffect(() => {
    if (!state) {
      setPosition(null);
      return;
    }
    const panel = panelRef.current;
    if (!panel) return;
    const margin = 8;
    const rect = panel.getBoundingClientRect();
    setPosition({
      state,
      left: Math.max(margin, Math.min(state.x, window.innerWidth - rect.width - margin)),
      top: Math.max(
        margin,
        Math.min(state.y, window.innerHeight - rect.height - margin),
      ),
    });
  }, [state]);

  if (!state) return null;

  const active = position?.state === state ? position : null;

  return createPortal(
    <div
      ref={panelRef}
      role="menu"
      aria-label="Context menu"
      onMouseDown={(event) => event.stopPropagation()}
      onContextMenu={(event) => event.preventDefault()}
      style={{
        left: active?.left ?? state.x,
        top: active?.top ?? state.y,
        visibility: active ? "visible" : "hidden",
      }}
      className="animate-pop-in fixed z-[70] w-max max-w-[calc(100vw-1rem)] max-h-[calc(100dvh-1rem)] overflow-y-auto rounded-[var(--radius-card)] border border-[var(--color-void-700)] bg-void-800 p-1.5 shadow-[0_20px_50px_rgba(0,0,0,0.6)]"
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
              "flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-sm transition-colors disabled:pointer-events-none disabled:opacity-60",
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
            <span className="min-w-0">{entry.label}</span>
          </button>
        );
      })}
    </div>,
    document.body,
  );
}
