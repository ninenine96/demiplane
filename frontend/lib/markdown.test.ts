import { describe, expect, it, vi } from "vitest";

vi.mock("dompurify", () => ({
  default: { sanitize: (html: string) => html },
}));

import { renderMarkdown } from "./markdown";

describe("renderMarkdown extensions", () => {
  it("marks ==highlighted== text", () => {
    expect(renderMarkdown("a ==bright== word")).toContain(
      "<mark>bright</mark>",
    );
  });

  it("renders wikilinks with a data attribute", () => {
    const html = renderMarkdown("See [[Opening a portal]].");
    expect(html).toContain('data-wikilink="Opening a portal"');
    expect(html).toContain(">Opening a portal</a>");
  });

  it("renders wikilink aliases as the label", () => {
    const html = renderMarkdown("See [[Opening a portal|the portal]].");
    expect(html).toContain('data-wikilink="Opening a portal"');
    expect(html).toContain(">the portal</a>");
  });

  it("renders callouts with type and title", () => {
    const html = renderMarkdown(
      "> [!warning] Mind the gap\n> The bridge is out.",
    );
    expect(html).toContain('class="callout callout-warning"');
    expect(html).toContain('class="callout-title">Mind the gap');
    expect(html).toContain("The bridge is out.");
  });
});
