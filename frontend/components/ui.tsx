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
    "bg-arcane-500 text-white hover:bg-arcane-400 shadow-[var(--shadow-arcane)]",
  gold: "bg-gold-400 text-void-950 hover:bg-gold-500 font-semibold",
  ghost:
    "bg-white/[0.04] text-parchment-100 border border-[var(--color-void-700)] hover:bg-white/[0.09] hover:border-arcane-500/50",
  danger:
    "bg-ember-400/15 text-ember-400 border border-ember-400/35 hover:bg-ember-400/25",
};

const SIZES: Record<Size, string> = {
  sm: "h-9 px-3 text-[13px] gap-1.5",
  md: "h-11 px-4 text-sm gap-2",
  lg: "h-12 px-5 text-[15px] gap-2",
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
        "h-11 w-full rounded-[var(--radius-control)] border border-[var(--color-void-700)]",
        "bg-void-950/70 px-3 text-parchment-100 placeholder:text-parchment-500/70",
        "outline-none transition-colors focus:border-arcane-400",
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
          ? "border-arcane-400/60 bg-arcane-500/20 text-arcane-300"
          : "border-[var(--color-void-700)] text-parchment-500 hover:text-parchment-100",
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
    success: "text-gold-400",
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
        className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-arcane-400/40 border-t-arcane-300"
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
      <p className="max-w-xs text-sm text-parchment-500">{children}</p>
    </div>
  );
}
