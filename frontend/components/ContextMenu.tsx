import { useEffect, useState, type MouseEvent, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { cx } from "./ui";

export interface ContextMenuItem {
  label: string;
  icon?: ReactNode;
  danger?: boolean;
  onSelect: () => void;
}

interface MenuState {
  x: number;
  y: number;
  items: ContextMenuItem[];
}

/** Right-click menus, positioned at the cursor and clamped to the viewport. */
export function useContextMenu() {
  const [state, setState] = useState<MenuState | null>(null);

  function open(event: MouseEvent, items: ContextMenuItem[]) {
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
  const height = state.items.length * 38 + 12;
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
      {state.items.map((item) => (
        <button
          key={item.label}
          type="button"
          role="menuitem"
          onClick={() => {
            item.onSelect();
            onClose();
          }}
          className={cx(
            "flex w-full items-center gap-2.5 whitespace-nowrap rounded-lg px-3 py-2 text-left text-sm transition-colors",
            item.danger
              ? "text-ember-400 hover:bg-ember-400/10"
              : "text-parchment-300 hover:bg-white/[0.06] hover:text-parchment-100",
          )}
        >
          {item.icon ? (
            <span aria-hidden="true" className="shrink-0 text-parchment-500">
              {item.icon}
            </span>
          ) : null}
          {item.label}
        </button>
      ))}
    </div>,
    document.body,
  );
}
