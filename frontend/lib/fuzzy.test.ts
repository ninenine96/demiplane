import { describe, expect, it } from "vitest";
import { fuzzyFilter, fuzzyScore } from "./fuzzy";

describe("fuzzyScore", () => {
  it("matches subsequences case-insensitively", () => {
    expect(fuzzyScore("np", "New page")).not.toBeNull();
    expect(fuzzyScore("NEW", "new page")).not.toBeNull();
  });

  it("rejects non-subsequences", () => {
    expect(fuzzyScore("zzz", "New page")).toBeNull();
  });

  it("rewards word-start matches", () => {
    const start = fuzzyScore("pa", "Page") ?? 0;
    const middle = fuzzyScore("pa", "apart") ?? 0;
    expect(start).toBeGreaterThan(middle);
  });
});

describe("fuzzyFilter", () => {
  const items = ["New page", "Focus the page", "Export grimoire"];

  it("returns everything for an empty query", () => {
    expect(fuzzyFilter("", items, (item) => item)).toEqual(items);
  });

  it("filters to matching entries", () => {
    expect(fuzzyFilter("page", items, (item) => item)).toEqual([
      "New page",
      "Focus the page",
    ]);
  });
});
