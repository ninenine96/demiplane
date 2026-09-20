import { describe, expect, it } from "vitest";
import { formatStamp } from "./format";

describe("formatStamp", () => {
  const date = new Date(2026, 8, 20, 14, 5);

  it("writes the date as YYYY-MM-DD", () => {
    expect(formatStamp("date", date)).toBe("2026-09-20");
  });

  it("writes the hour as HH:mm", () => {
    expect(formatStamp("time", date)).toBe("14:05");
  });

  it("joins date and hour for the full inscription", () => {
    expect(formatStamp("datetime", date)).toBe("2026-09-20 14:05");
  });
});
