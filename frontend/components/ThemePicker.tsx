import { Check, RotateCcw } from "lucide-react";
import { FLAVOUR } from "../../shared/messages";
import {
  MAX_CONTRAST,
  MIN_CONTRAST,
  THEMES,
  type Theme,
} from "../lib/themes";
import { cx } from "./ui";

/** Three bands — ground, accent, secondary — of a theme's palette. */
export function ThemeSwatch({
  theme,
  className,
}: {
  theme: Theme;
  className?: string;
}) {
  return (
    <span
      aria-hidden="true"
      className={cx(
        "flex h-4 w-8 shrink-0 overflow-hidden rounded-full ring-1 ring-inset ring-white/10",
        className,
      )}
    >
      <span className="flex-1" style={{ background: theme.bg }} />
      <span className="flex-1" style={{ background: theme.main }} />
      <span className="flex-1" style={{ background: theme.secondary }} />
    </span>
  );
}

/** The gallery itself, shared by the footer popover and the palette. */
export function ThemeList({
  activeId,
  onSelect,
  contrast,
  onContrastChange,
}: {
  activeId: string;
  onSelect: (id: string) => void;
  contrast: number;
  onContrastChange: (value: number) => void;
}) {
  return (
    <div>
      <div className="px-1 pb-2">
        <p className="text-[0.625rem] uppercase tracking-[0.18em] text-parchment-500">
          {FLAVOUR.themeTitle}
        </p>
        <p className="mt-1 text-[0.6875rem] leading-relaxed text-parchment-500/80">
          {FLAVOUR.themeHint}
        </p>
      </div>
      <ul className="space-y-0.5">
        {THEMES.map((theme) => {
          const active = theme.id === activeId;
          return (
            <li key={theme.id}>
              <button
                type="button"
                onClick={() => onSelect(theme.id)}
                aria-pressed={active}
                className={cx(
                  "flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-sm transition-colors",
                  active
                    ? "bg-white/[0.06] text-parchment-100"
                    : "text-parchment-300 hover:bg-white/[0.05] hover:text-parchment-100",
                )}
              >
                <ThemeSwatch theme={theme} />
                <span className="min-w-0 flex-1 truncate">
                  {theme.name}
                  <span className="text-parchment-500"> ({theme.base})</span>
                </span>
                {active ? (
                  <Check
                    size={14}
                    aria-hidden="true"
                    className="shrink-0 text-gold-300"
                  />
                ) : null}
              </button>
            </li>
          );
        })}
      </ul>

      <div className="mt-2 border-t border-[var(--color-void-700)] px-1 pb-1 pt-3">
        <div className="flex items-baseline justify-between gap-2">
          <p className="text-[0.625rem] uppercase tracking-[0.18em] text-parchment-500">
            {FLAVOUR.lettersTitle}
          </p>
          <span className="text-[0.6875rem] tabular-nums text-parchment-500">
            {Math.round(contrast * 100)}%
          </span>
        </div>
        <input
          type="range"
          min={Math.round(MIN_CONTRAST * 100)}
          max={Math.round(MAX_CONTRAST * 100)}
          step={5}
          value={Math.round(contrast * 100)}
          onChange={(event) =>
            onContrastChange(Number(event.target.value) / 100)
          }
          aria-label={FLAVOUR.lettersTitle}
          aria-valuetext={`${Math.round(contrast * 100)}%`}
          className="mt-2 h-1 w-full cursor-pointer accent-[var(--color-gold-400)]"
        />
        <p className="mt-1.5 text-[0.6875rem] leading-relaxed text-parchment-500/80">
          {FLAVOUR.lettersHint}
        </p>
        {contrast < MAX_CONTRAST ? (
          <div className="mt-1.5 flex justify-end">
            <button
              type="button"
              onClick={() => onContrastChange(MAX_CONTRAST)}
              className="flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[0.6875rem] text-parchment-500 transition-colors hover:bg-white/[0.06] hover:text-gold-300"
            >
              <RotateCcw size={12} aria-hidden="true" />
              {FLAVOUR.lettersDefault}
            </button>
          </div>
        ) : null}
      </div>
    </div>
  );
}
