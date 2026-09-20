import { describe, expect, it } from "vitest";
import {
  countTasks,
  isTaskLine,
  toggleTaskAt,
  toggleTaskMarker,
} from "./checklist";

describe("toggleTaskMarker", () => {
  it("checks an open task", () => {
    expect(toggleTaskMarker("- [ ] scout the pass")).toBe("- [x] scout the pass");
  });

  it("unchecks a done task, whatever its case", () => {
    expect(toggleTaskMarker("- [x] scout the pass")).toBe("- [ ] scout the pass");
    expect(toggleTaskMarker("- [X] scout the pass")).toBe("- [ ] scout the pass");
  });

  it("keeps the leading indent and bullet flavour", () => {
    expect(toggleTaskMarker("  1. [ ] rest")).toBe("  1. [x] rest");
    expect(toggleTaskMarker("\t* [ ] rest")).toBe("\t* [x] rest");
  });

  it("ignores a line without a task marker", () => {
    expect(toggleTaskMarker("- a plain list")).toBeNull();
  });
});

describe("isTaskLine", () => {
  it("recognises bullets and ordered items", () => {
    expect(isTaskLine("- [ ] a")).toBe(true);
    expect(isTaskLine("+ [x] a")).toBe(true);
    expect(isTaskLine("3) [ ] a")).toBe(true);
    expect(isTaskLine("> [ ] a")).toBe(false);
  });
});

describe("toggleTaskAt", () => {
  const doc = "- [ ] one\n- [x] two\n\n```\n- [ ] fenced\n```\n- [ ] three\n";

  it("flips only the indexed task", () => {
    expect(toggleTaskAt(doc, 0)).toContain("- [x] one");
    expect(toggleTaskAt(doc, 1)).toContain("- [ ] two");
  });

  it("skips tasks hidden inside fenced code", () => {
    const next = toggleTaskAt(doc, 2);
    expect(next).toContain("- [ ] fenced");
    expect(next).toContain("- [x] three");
  });

  it("leaves the document untouched for an unknown index", () => {
    expect(toggleTaskAt(doc, 9)).toBe(doc);
  });
});

describe("countTasks", () => {
  it("counts tasks outside fenced code", () => {
    expect(countTasks("- [ ] one\n- [x] two\n```\n- [ ] x\n```")).toBe(2);
  });
});
