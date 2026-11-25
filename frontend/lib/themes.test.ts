import { describe, expect, it } from "vitest";
import {
  DEFAULT_THEME_ID,
  MAX_CONTRAST,
  MIN_CONTRAST,
  THEMES,
  THEME_TOKENS,
  clampContrast,
  getTheme,
  randomThemeId,
  themeLabel,
  themeToVars,
} from "./themes";

const HEX = /^#[0-9a-f]{6}$/i;

describe("themes", () => {
  it("ships a decent gallery with unique ids", () => {
    expect(THEMES.length).toBeGreaterThanOrEqual(10);
    const ids = new Set(THEMES.map((theme) => theme.id));
    expect(ids.size).toBe(THEMES.length);
    expect(ids.has(DEFAULT_THEME_ID)).toBe(true);
  });

  it("seeds every theme with valid hex colours", () => {
    for (const theme of THEMES) {
      expect(theme.id).toMatch(/^[a-z0-9-]+$/);
      expect(theme.name.length).toBeGreaterThan(0);
      expect(theme.base.length).toBeGreaterThan(0);
      for (const colour of [
        theme.bg,
        theme.main,
        theme.text,
        theme.sub,
        theme.secondary,
        theme.error,
      ]) {
        expect(colour).toMatch(HEX);
      }
    }
  });

  it("derives a value for every design token", () => {
    for (const theme of THEMES) {
      const vars = themeToVars(theme);
      for (const token of THEME_TOKENS) {
        expect(vars[token]?.length ?? 0).toBeGreaterThan(0);
      }
    }
  });

  it("falls back to the default theme for an unknown id", () => {
    expect(getTheme("does-not-exist").id).toBe(DEFAULT_THEME_ID);
    expect(getTheme(DEFAULT_THEME_ID).id).toBe(DEFAULT_THEME_ID);
  });

  it("labels a theme with its arcane and original names", () => {
    expect(themeLabel(getTheme("mystic-gilt"))).toBe(
      "Mystic Gilt (Serika Dark)",
    );
  });

  it("never picks the excluded theme at random", () => {
    for (let i = 0; i < 40; i += 1) {
      expect(randomThemeId("mystic-gilt")).not.toBe("mystic-gilt");
    }
  });

  it("leaves the seeds untouched at full contrast", () => {
    for (const theme of THEMES) {
      const vars = themeToVars(theme, MAX_CONTRAST);
      expect(vars["--color-parchment-100"]).toBe(
        theme.tokens?.["--color-parchment-100"] ?? theme.text,
      );
    }
  });

  it("softens only the letters toward the ground", () => {
    const theme = getTheme("mystic-gilt");
    const vars = themeToVars(theme, 0.75);
    expect(vars["--color-parchment-100"]).toContain(theme.bg);
    expect(vars["--color-parchment-100"]).toContain("75%");
    // Muted letters soften less, so they never wash out.
    expect(vars["--color-parchment-300"]).toContain(theme.bg);
    expect(vars["--color-parchment-300"]).toContain("81%");
    expect(vars["--color-parchment-500"]).toContain(theme.bg);
    expect(vars["--color-parchment-500"]).toContain("88%");
    // The ground, the accents and the glows are untouched.
    expect(vars["--color-void-950"]).toBe(theme.bg);
    expect(vars["--color-gold-400"]).toBe(theme.main);
    expect(vars["--color-arcane-400"]).toBe(theme.secondary);
  });

  it("softens a theme's exact tokens too", () => {
    const theme = getTheme(DEFAULT_THEME_ID);
    const vars = themeToVars(theme, 0.7);
    expect(vars["--color-parchment-100"]).toContain("70%");
    expect(vars["--color-parchment-100"]).toContain(theme.bg);
  });

  it("clamps contrast to the readable range", () => {
    expect(clampContrast(0.2)).toBe(MIN_CONTRAST);
    expect(clampContrast(4)).toBe(MAX_CONTRAST);
    expect(clampContrast(Number.NaN)).toBe(MAX_CONTRAST);
    expect(clampContrast(0.8)).toBe(0.8);
  });
});
