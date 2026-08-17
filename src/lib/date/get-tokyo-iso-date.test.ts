import { describe, expect, it } from "vitest";
import { getTokyoIsoDate } from "./get-tokyo-iso-date";

describe("getTokyoIsoDate", () => {
  it("JST の日付を YYYY-MM-DD で返す", () => {
    expect(getTokyoIsoDate({ now: new Date("2026-08-17T03:15:00Z") })).toBe("2026-08-17");
  });

  it("UTC 日跨ぎでも JST の当日を返す", () => {
    expect(getTokyoIsoDate({ now: new Date("2026-08-16T15:30:00Z") })).toBe("2026-08-17");
  });

  it("JST の朝 9 時前は前日 UTC を引きずらない", () => {
    expect(getTokyoIsoDate({ now: new Date("2026-08-16T23:30:00Z") })).toBe("2026-08-17");
  });

  it("JST の 0 時直前は前日を返す", () => {
    expect(getTokyoIsoDate({ now: new Date("2026-08-16T14:59:59Z") })).toBe("2026-08-16");
  });
});
