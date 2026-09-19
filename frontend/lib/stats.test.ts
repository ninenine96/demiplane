import { describe, expect, it } from "vitest";
import { countWords, readingMinutes } from "./stats";

describe("countWords", () => {
  it("counts prose words", () => {
    expect(countWords("The portal recognises you.")).toBe(4);
  });

  it("ignores fenced code, inline code and link targets", () => {
    expect(countWords("```\ncode is not prose\n```")).toBe(0);
    expect(countWords("a `snippet` b")).toBe(2);
    expect(countWords("[label](http://example.com) word")).toBe(2);
  });

  it("handles an empty page", () => {
    expect(countWords("   \n  ")).toBe(0);
  });
});

describe("readingMinutes", () => {
  it("is zero for an empty page", () => {
    expect(readingMinutes(0)).toBe(0);
  });

  it("rounds to at least a minute", () => {
    expect(readingMinutes(10)).toBe(1);
    expect(readingMinutes(440)).toBe(2);
  });
});
