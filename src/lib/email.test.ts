import { describe, expect, it } from "vitest";
import { loginCodeMessage } from "./login-email";

const CODE = "123456";

describe("loginCodeMessage", () => {
  it("puts the unbroken code in the subject", () => {
    expect(loginCodeMessage(CODE).subject).toContain(CODE);
  });

  it("keeps the plain-text sigil contiguous so a copy pastes cleanly", () => {
    const { text } = loginCodeMessage(CODE);
    expect(text).toContain(`Your sigil: ${CODE}`);
    expect(text).not.toContain("1 2 3 4 5 6");
  });

  it("keeps the HTML sigil contiguous, spacing it with CSS only", () => {
    const { html } = loginCodeMessage(CODE);
    expect(html).toContain(`>${CODE}<`);
    expect(html).not.toContain("1 2 3 4 5 6");

    // Whatever sits between the tags holding the code must be digits only.
    const held = /<p style="[^"]*">([^<]*)<\/p>/gu;
    const candidates = [...html.matchAll(held)]
      .map((match) => match[1] ?? "")
      .filter((value) => value.includes("1"));
    expect(candidates).toContain(CODE);
    for (const value of candidates) {
      expect(value).toMatch(/^\d+$/u);
    }
  });

  it("carries the flavour and the expiry in the body", () => {
    const { text, html } = loginCodeMessage(CODE);
    expect(text).toContain("ten minutes");
    expect(html).toContain("ten minutes");
  });
});
