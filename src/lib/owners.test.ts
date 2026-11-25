import { describe, expect, it } from "vitest";
import {
  allowedEmails,
  isAllowedEmail,
  normalizeEmail,
  primaryOwner,
} from "./owners";

function env(vars: Partial<Env>): Env {
  return vars as Env;
}

describe("normalizeEmail", () => {
  it("trims and lowercases so ownership is stable", () => {
    expect(normalizeEmail("  Keeper@Example.COM ")).toBe("keeper@example.com");
  });
});

describe("primaryOwner", () => {
  it("is the normalised OWNER_EMAIL", () => {
    expect(primaryOwner(env({ OWNER_EMAIL: " Keeper@Example.com " }))).toBe(
      "keeper@example.com",
    );
  });

  it("is empty when the deployment names no keeper", () => {
    expect(primaryOwner(env({}))).toBe("");
  });
});

describe("allowedEmails", () => {
  it("puts the keeper first and then the invited addresses", () => {
    expect(
      allowedEmails(
        env({ OWNER_EMAIL: "keeper@example.com", ALLOWED_EMAILS: "uat@example.com" }),
      ),
    ).toEqual(["keeper@example.com", "uat@example.com"]);
  });

  it("trims, lowercases, drops blanks and collapses duplicates", () => {
    expect(
      allowedEmails(
        env({
          OWNER_EMAIL: "keeper@example.com",
          ALLOWED_EMAILS: " UAT@Example.com , , keeper@example.com ,second@example.com",
        }),
      ),
    ).toEqual(["keeper@example.com", "uat@example.com", "second@example.com"]);
  });

  it("still lists invited addresses when no keeper is configured", () => {
    expect(allowedEmails(env({ ALLOWED_EMAILS: "uat@example.com" }))).toEqual([
      "uat@example.com",
    ]);
  });
});

describe("isAllowedEmail", () => {
  it("admits a listed address in any case", () => {
    const configured = env({
      OWNER_EMAIL: "keeper@example.com",
      ALLOWED_EMAILS: "uat@example.com",
    });
    expect(isAllowedEmail(configured, "UAT@Example.com ")).toBe(true);
    expect(isAllowedEmail(configured, "keeper@example.com")).toBe(true);
  });

  it("turns away anyone not listed, including a look-alike", () => {
    const configured = env({
      OWNER_EMAIL: "keeper@example.com",
      ALLOWED_EMAILS: "uat@example.com",
    });
    expect(isAllowedEmail(configured, "stranger@example.com")).toBe(false);
    expect(isAllowedEmail(configured, "uat@example.com.evil.test")).toBe(false);
    expect(isAllowedEmail(configured, "")).toBe(false);
  });
});
