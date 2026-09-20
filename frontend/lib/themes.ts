/**
 * Dynamic theming — Monkeytype style.
 *
 * Each theme is a small seed palette (background, accent, text, muted,
 * secondary accent, error). The full set of design tokens used across the app
 * is derived from those seeds with `color-mix`, so a new theme is a handful of
 * hex values and every surface follows along. Themes are applied at runtime by
 * writing CSS custom properties onto the document root; nothing is compiled in.
 *
 * See the Flavour Charter: themes carry an arcane name first, with the
 * Monkeytype palette they draw from in parentheses.
 */

export const THEME_TOKENS = [
  "--color-void-950",
  "--color-void-900",
  "--color-void-800",
  "--color-void-700",
  "--color-void-600",
  "--color-parchment-100",
  "--color-parchment-300",
  "--color-parchment-500",
  "--color-gold-400",
  "--color-gold-500",
  "--color-gold-300",
  "--color-arcane-500",
  "--color-arcane-400",
  "--color-arcane-300",
  "--color-ember-400",
  "--color-sage-400",
] as const;

export type ThemeToken = (typeof THEME_TOKENS)[number];

/** Design tokens plus the derived hairlines and glows. */
export type ThemeVar =
  | ThemeToken
  | "--gild"
  | "--gild-faint"
  | "--glow-arcane"
  | "--glow-gold";

export interface Theme {
  id: string;
  /** Arcane name, shown first. */
  name: string;
  /** The palette this draws from, shown in parentheses. */
  base: string;
  /** Seed colours. Everything else is derived. */
  bg: string;
  main: string;
  text: string;
  sub: string;
  secondary: string;
  error: string;
  /** Exact overrides, for the original Demiplane palette. */
  tokens?: Partial<Record<ThemeVar, string>>;
}

export const DEFAULT_THEME_ID = "demiplane";
export const THEME_STORAGE_KEY = "demiplane.theme";

const ORIGINAL_TOKENS: Record<ThemeToken, string> = {
  "--color-void-950": "#131110",
  "--color-void-900": "#1a1714",
  "--color-void-800": "#211d19",
  "--color-void-700": "#2e2823",
  "--color-void-600": "#3b342c",
  "--color-parchment-100": "#f1e9da",
  "--color-parchment-300": "#cbbfad",
  "--color-parchment-500": "#a4998a",
  "--color-gold-400": "#c3a15c",
  "--color-gold-500": "#93743a",
  "--color-gold-300": "#d9c08a",
  "--color-arcane-500": "#5f4d92",
  "--color-arcane-400": "#7d6ab0",
  "--color-arcane-300": "#a396c9",
  "--color-ember-400": "#c76f66",
  "--color-sage-400": "#86a98c",
};

export const THEMES: Theme[] = [
  {
    id: DEFAULT_THEME_ID,
    name: "Demiplane",
    base: "Original",
    bg: "#131110",
    main: "#c3a15c",
    text: "#f1e9da",
    sub: "#a4998a",
    secondary: "#7d6ab0",
    error: "#c76f66",
    tokens: {
      ...ORIGINAL_TOKENS,
      "--gild": "rgba(195, 161, 92, 0.5)",
      "--gild-faint": "rgba(195, 161, 92, 0.16)",
      "--glow-arcane": "rgba(95, 77, 146, 0.16)",
      "--glow-gold": "rgba(147, 116, 58, 0.09)",
    },
  },
  {
    id: "mystic-gilt",
    name: "Mystic Gilt",
    base: "Serika Dark",
    bg: "#323437",
    main: "#e2b714",
    text: "#d1d0c5",
    sub: "#8f9396",
    secondary: "#8ab4a7",
    error: "#ca4754",
  },
  {
    id: "sanguine",
    name: "Sanguine",
    base: "Dracula",
    bg: "#282a36",
    main: "#bd93f9",
    text: "#f8f8f2",
    sub: "#8b90b0",
    secondary: "#ff79c6",
    error: "#ff5555",
  },
  {
    id: "leyline",
    name: "Leyline",
    base: "Monokai",
    bg: "#272822",
    main: "#a6e22e",
    text: "#e3e3df",
    sub: "#9a9584",
    secondary: "#66d9ef",
    error: "#f13c20",
  },
  {
    id: "rime",
    name: "Rime",
    base: "Nord",
    bg: "#2e3440",
    main: "#88c0d0",
    text: "#eceff4",
    sub: "#7d8aa3",
    secondary: "#b48ead",
    error: "#bf616a",
  },
  {
    id: "forge",
    name: "Forge",
    base: "Carbon",
    bg: "#313131",
    main: "#f66e0d",
    text: "#f5e6c8",
    sub: "#9a938a",
    secondary: "#d9a05b",
    error: "#e72d2d",
  },
  {
    id: "nightshade",
    name: "Nightshade",
    base: "Matrix",
    bg: "#0d0208",
    main: "#00ff41",
    text: "#d6ffe0",
    sub: "#3f9a5c",
    secondary: "#00d1b2",
    error: "#ff3b3b",
  },
  {
    id: "oracle",
    name: "Oracle",
    base: "Olivia",
    bg: "#1c1b1d",
    main: "#deaf9d",
    text: "#f2efed",
    sub: "#8f8a8a",
    secondary: "#b8a5d8",
    error: "#bf616a",
  },
  {
    id: "aurora",
    name: "Aurora",
    base: "Aurora",
    bg: "#011926",
    main: "#00e980",
    text: "#b9f2ff",
    sub: "#48929f",
    secondary: "#00b4d8",
    error: "#ff5c5c",
  },
  {
    id: "rosewood",
    name: "Rosewood",
    base: "Rosé Pine",
    bg: "#191724",
    main: "#ebbcba",
    text: "#e0def4",
    sub: "#807c9a",
    secondary: "#9ccfd8",
    error: "#eb6f92",
  },
  {
    id: "mithril",
    name: "Mithril",
    base: "8008",
    bg: "#333a45",
    main: "#f44c7f",
    text: "#e9ecf0",
    sub: "#939eb3",
    secondary: "#7096d1",
    error: "#ff6b6b",
  },
  {
    id: "macchiato",
    name: "Macchiato",
    base: "Catppuccin",
    bg: "#24273a",
    main: "#c6a0f6",
    text: "#cad3f5",
    sub: "#8a91b4",
    secondary: "#8bd5ca",
    error: "#ed8796",
  },
  {
    id: "abyss",
    name: "Abyss",
    base: "Cyberspace",
    bg: "#181c18",
    main: "#00ce7c",
    text: "#b8ddd8",
    sub: "#5f7a72",
    secondary: "#00b3a4",
    error: "#ff5f5f",
  },
  {
    id: "inkwell",
    name: "Inkwell",
    base: "Terminal",
    bg: "#191a1b",
    main: "#79a617",
    text: "#e7eae0",
    sub: "#7d817b",
    secondary: "#5fa8a1",
    error: "#bf5d5d",
  },
  {
    id: "emberfall",
    name: "Emberfall",
    base: "Dark Magic Girl",
    bg: "#091f2c",
    main: "#f5b1cc",
    text: "#d6e0e6",
    sub: "#7c93a3",
    secondary: "#a37ff0",
    error: "#ff5f8f",
  },
];

/** Blend `a` into `b`; when `b` is `transparent` this yields an alpha tint. */
function mix(a: string, pct: number, b: string): string {
  return `color-mix(in srgb, ${a} ${pct}%, ${b})`;
}

function derived(t: Theme): Record<ThemeToken, string> {
  const { bg, main, text, sub, secondary, error } = t;
  return {
    "--color-void-950": bg,
    "--color-void-900": mix(text, 6, bg),
    "--color-void-800": mix(text, 11, bg),
    "--color-void-700": mix(text, 18, bg),
    "--color-void-600": mix(text, 27, bg),
    "--color-parchment-100": text,
    "--color-parchment-300": mix(text, 80, bg),
    "--color-parchment-500": sub,
    "--color-gold-400": main,
    "--color-gold-500": mix(main, 60, bg),
    "--color-gold-300": mix(main, 68, "#ffffff"),
    "--color-arcane-500": mix(secondary, 55, bg),
    "--color-arcane-400": secondary,
    "--color-arcane-300": mix(secondary, 40, text),
    "--color-ember-400": error,
    "--color-sage-400": "#86a98c",
  };
}

/** The full set of custom properties a theme writes onto the root. */
export function themeToVars(theme: Theme): Record<string, string> {
  const base: Record<string, string> = {
    ...derived(theme),
    "--gild": mix(theme.main, 50, "transparent"),
    "--gild-faint": mix(theme.main, 16, "transparent"),
    "--glow-arcane": mix(theme.secondary, 16, "transparent"),
    "--glow-gold": mix(theme.main, 9, "transparent"),
  };
  return { ...base, ...(theme.tokens ?? {}) };
}

export function getTheme(id: string): Theme {
  return THEMES.find((theme) => theme.id === id) ?? THEMES[0]!;
}

/** "Mystic Gilt (Serika Dark)" — the arcane name, with its palette beside it. */
export function themeLabel(theme: Theme): string {
  return `${theme.name} (${theme.base})`;
}

export function initialThemeId(): string {
  if (typeof window === "undefined") return DEFAULT_THEME_ID;
  const stored = window.localStorage.getItem(THEME_STORAGE_KEY);
  return stored && THEMES.some((theme) => theme.id === stored)
    ? stored
    : DEFAULT_THEME_ID;
}

export function randomThemeId(exclude?: string): string {
  const pool = THEMES.filter((theme) => theme.id !== exclude);
  const pick = pool[Math.floor(Math.random() * pool.length)];
  return (pick ?? THEMES[0]!).id;
}

export function applyTheme(id: string, doc: Document = document): void {
  const theme = getTheme(id);
  const root = doc.documentElement;
  for (const [key, value] of Object.entries(themeToVars(theme))) {
    root.style.setProperty(key, value);
  }
  root.dataset.theme = theme.id;
  root.style.colorScheme = "dark";
  const meta = doc.querySelector('meta[name="theme-color"]');
  if (meta) meta.setAttribute("content", theme.bg);
}
