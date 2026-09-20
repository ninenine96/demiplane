import { describe, expect, it } from "vitest";
import {
  DEFAULT_THEME_ID,
  THEMES,
  THEME_TOKENS,
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
});
