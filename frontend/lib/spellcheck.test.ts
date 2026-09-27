import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
  cleanWord,
  isMisspelled,
  isProtectedSpan,
  loadSpell,
  protectedRanges,
  suggestionsFor,
  wikilinkAt,
  wordAt,
} from "./spellcheck";

describe("wordAt", () => {
  it("finds the word touching an offset, including its end", () => {
    const line = "the quick brown fox";
    expect(wordAt(line, 5)?.text).toBe("quick");
    expect(wordAt(line, 9)?.text).toBe("quick");
    expect(wordAt(line, 0)?.text).toBe("the");
    expect(wordAt(line, 19)?.text).toBe("fox");
  });

  it("returns null in the space between words", () => {
    expect(wordAt("  ", 1)).toBeNull();
    expect(wordAt("hello  world", 6)).toBeNull();
  });

  it("keeps trailing punctuation out of the span", () => {
    expect(wordAt("demiplane- is here", 3)).toEqual({
      from: 0,
      to: 9,
      text: "demiplane",
    });
  });
});

describe("wikilinkAt", () => {
  it("reads the target when the offset sits inside the link", () => {
    const line = "see [[The Void]] now";
    expect(wikilinkAt(line, 8)).toBe("The Void");
    expect(wikilinkAt(line, 0)).toBeNull();
  });

  it("ignores the display half of a piped link", () => {
    expect(wikilinkAt("[[Target|shown]]", 3)).toBe("Target");
  });
});

describe("protectedRanges", () => {
  it("shields wikilinks, links, URLs and inline code", () => {
    const line = "a [[wiki]] b [x](https://e.com) c `code`";
    const ranges = protectedRanges(line);
    const wiki = line.indexOf("[[wiki]]");
    const url = line.indexOf("https://e.com");
    const code = line.indexOf("`code`");
    expect(isProtectedSpan(ranges, wiki, wiki + 2)).toBe(true);
    expect(isProtectedSpan(ranges, url, url + 5)).toBe(true);
    expect(isProtectedSpan(ranges, code, code + 3)).toBe(true);
    expect(isProtectedSpan(ranges, 0, 1)).toBe(false);
  });
});

describe("cleanWord", () => {
  it("trims surrounding punctuation but keeps inner apostrophes", () => {
    expect(cleanWord('"don\'t,"')).toBe("don't");
    expect(cleanWord("...word!")).toBe("word");
  });
});

describe("the lexicon", () => {
  beforeAll(async () => {
    await loadSpell();
  });

  afterAll(() => {
    // The singleton persists, but the node environment has no localStorage.
  });

  it("knows common words and doubts typos", () => {
    expect(isMisspelled("the")).toBe(false);
    expect(isMisspelled("teh")).toBe(true);
  });

  it("offers the intended correction", () => {
    expect(suggestionsFor("teh")).toContain("the");
    expect(suggestionsFor("teh")[0]).toBe("the");
  });

  it("leaves tiny words and code-like tokens alone", () => {
    expect(isMisspelled("a")).toBe(false);
    expect(isMisspelled("x1")).toBe(false);
  });
});
