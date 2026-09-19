import type { ButtonHTMLAttributes, ReactNode } from "react";
import { PLAIN } from "../../shared/messages";

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "ghost" | "danger";
};

export function Button({
  variant = "primary",
  className = "",
  ...props
}: ButtonProps) {
  const styles = {
    primary:
      "bg-arcane-500 hover:bg-arcane-400 text-white shadow-lg shadow-arcane-500/20",
    ghost:
      "bg-white/5 hover:bg-white/10 text-parchment-100 border border-white/10",
    danger:
      "bg-red-900/50 hover:bg-red-800/60 text-red-100 border border-red-500/30",
  }[variant];

  return (
    <button
      {...props}
      className={`rounded-lg px-3 py-2 text-sm font-medium transition disabled:cursor-not-allowed disabled:opacity-50 ${styles} ${className}`}
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
    error: "text-red-300",
    success: "text-gold-400",
  }[tone];

  return (
    <p className={`text-sm ${toneClass}`}>
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

export function EmptyState({ children }: { children: ReactNode }) {
  return (
    <div className="px-6 py-16 text-center text-parchment-500 italic">
      {children}
    </div>
  );
}
