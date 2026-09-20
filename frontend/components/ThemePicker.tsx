import { Check } from "lucide-react";
import { FLAVOUR } from "../../shared/messages";
import { THEMES, type Theme } from "../lib/themes";
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
}: {
  activeId: string;
  onSelect: (id: string) => void;
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
    </div>
  );
}
