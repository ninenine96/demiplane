import { useEffect, useRef, useState } from "react";
import type {
  ButtonHTMLAttributes,
  InputHTMLAttributes,
  ReactNode,
} from "react";
import { PLAIN } from "../../shared/messages";

export function cx(...parts: Array<string | false | null | undefined>): string {
  return parts.filter(Boolean).join(" ");
}

type Variant = "primary" | "ghost" | "danger" | "gold";
type Size = "sm" | "md" | "lg";

const VARIANTS: Record<Variant, string> = {
  primary:
    "bg-arcane-500 text-parchment-100 border border-arcane-400/30 hover:bg-arcane-400 shadow-[inset_0_1px_0_rgba(255,255,255,0.07)]",
  gold: "bg-gold-500 text-void-950 border border-gold-400/40 font-semibold hover:bg-gold-400 shadow-[inset_0_1px_0_rgba(255,255,255,0.14)]",
  ghost:
    "bg-white/[0.03] text-parchment-300 border border-[var(--color-void-600)] hover:bg-white/[0.06] hover:border-gold-500/40 hover:text-parchment-100",
  danger:
    "bg-ember-400/10 text-ember-400 border border-ember-400/30 hover:bg-ember-400/20",
};

const SIZES: Record<Size, string> = {
  sm: "h-9 px-3 text-[0.8125rem] gap-1.5",
  md: "h-11 px-4 text-sm gap-2",
  lg: "h-12 px-5 text-[0.9375rem] gap-2",
};

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant;
  size?: Size;
  icon?: ReactNode;
  block?: boolean;
};

export function Button({
  variant = "primary",
  size = "md",
  icon,
  block,
  className,
  children,
  ...props
}: ButtonProps) {
  return (
    <button
      {...props}
      className={cx(
        "inline-flex items-center justify-center rounded-[var(--radius-control)] font-medium",
        "transition-[background-color,border-color,transform] duration-150 active:translate-y-px",
        "disabled:cursor-not-allowed disabled:opacity-45 disabled:active:translate-y-0",
        VARIANTS[variant],
        SIZES[size],
        block && "w-full",
        className,
      )}
    >
      {icon ? <span aria-hidden="true" className="shrink-0">{icon}</span> : null}
      {children}
    </button>
  );
}

type IconButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  label: string;
  variant?: Variant;
  size?: Size;
  children: ReactNode;
};

export function IconButton({
  label,
  variant = "ghost",
  size = "md",
  className,
  children,
  ...props
}: IconButtonProps) {
  const dims = { sm: "h-9 w-9", md: "h-11 w-11", lg: "h-12 w-12" }[size];
  return (
    <button
      {...props}
      aria-label={label}
      title={label}
      className={cx(
        "inline-flex shrink-0 items-center justify-center rounded-[var(--radius-control)]",
        "transition-colors duration-150 disabled:opacity-45",
        VARIANTS[variant],
        dims,
        className,
      )}
    >
      <span aria-hidden="true">{children}</span>
    </button>
  );
}

export function Input({
  className,
  ...props
}: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className={cx(
        "h-11 w-full rounded-[var(--radius-control)] border border-[var(--color-void-600)]",
        "bg-void-950/70 px-3 text-parchment-100 placeholder:text-parchment-500/70",
        "outline-none transition-colors focus:border-gold-500/60",
        className,
      )}
    />
  );
}

export function Chip({
  active,
  className,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { active?: boolean }) {
  return (
    <button
      {...props}
      className={cx(
        "inline-flex items-center gap-1 rounded-full border px-3 py-1 text-xs transition-colors",
        active
          ? "border-gold-500/50 bg-gold-400/10 text-gold-300"
          : "border-[var(--color-void-600)] text-parchment-500 hover:border-gold-500/30 hover:text-parchment-100",
        className,
      )}
    />
  );
}

/**
 * Flavour up top, plain truth underneath. The `aria-live` region always
 * announces the literal status, per the Flavour Charter.
 */
export function StatusLine({
  flavour,
  plain,
  tone = "neutral",
}: {
  flavour: string;
  plain?: string;
  tone?: "neutral" | "error" | "success";
}) {
  const toneClass = {
    neutral: "text-parchment-500",
    error: "text-ember-400",
    success: "text-gold-300",
  }[tone];

  return (
    <p className={cx("text-sm", toneClass)}>
      {flavour}
      {plain ? <span className="sr-only">{plain}</span> : null}
    </p>
  );
}

export function Spinner({ label }: { label?: string }) {
  return (
    <span className="inline-flex items-center gap-2" role="status">
      <span
        aria-hidden="true"
        className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-gold-500/30 border-t-gold-400"
      />
      <span className="sr-only">{label ?? PLAIN.loadingNotes}</span>
    </span>
  );
}

export function EmptyState({
  children,
  icon,
}: {
  children: ReactNode;
  icon?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center gap-3 px-6 py-16 text-center">
      {icon ? (
        <span aria-hidden="true" className="text-parchment-500/50">
          {icon}
        </span>
      ) : null}
      <p className="max-w-xs font-display text-[0.8125rem] tracking-wide text-parchment-300">
        {children}
      </p>
    </div>
  );
}

/** A quiet popover anchored to a trigger. Children receive a close callback. */
export function Menu({
  label,
  trigger,
  panelClassName,
  children,
}: {
  label: string;
  trigger: ReactNode;
  panelClassName?: string;
  children: (close: () => void) => ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onPointer = (event: MouseEvent) => {
      if (ref.current && !ref.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        aria-label={label}
        aria-haspopup="dialog"
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
        className={cx(
          "inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-parchment-500",
          "transition-colors hover:bg-white/[0.06] hover:text-parchment-100",
          open && "bg-white/[0.06] text-parchment-100",
        )}
      >
        <span aria-hidden="true">{trigger}</span>
      </button>
      {open ? (
        <div
          className={cx(
            "absolute right-0 z-50 mt-2 w-72 rounded-[var(--radius-card)]",
            "border border-[var(--color-void-700)] bg-void-800 p-2",
            "shadow-[0_20px_50px_rgba(0,0,0,0.55)]",
            panelClassName,
          )}
        >
          {children(() => setOpen(false))}
        </div>
      ) : null}
    </div>
  );
}

export function MenuItem({
  icon,
  className,
  children,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { icon?: ReactNode }) {
  return (
    <button
      type="button"
      {...props}
      className={cx(
        "flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-sm",
        "text-parchment-300 transition-colors hover:bg-white/[0.05] hover:text-parchment-100",
        className,
      )}
    >
      {icon ? (
        <span aria-hidden="true" className="text-parchment-500">
          {icon}
        </span>
      ) : null}
      {children}
    </button>
  );
}

export function MenuDivider() {
  return <div className="my-1.5 h-px bg-[var(--color-void-700)]" />;
}

export function MenuLabel({ children }: { children: ReactNode }) {
  return (
    <p className="px-3 pb-1 pt-2 text-[0.625rem] uppercase tracking-[0.18em] text-parchment-500">
      {children}
    </p>
  );
}
