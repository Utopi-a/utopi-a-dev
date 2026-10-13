import { describe, expect, it } from "vitest";
import { resolveRecordableDateRange } from "./resolve-recordable-date-range";

describe("resolveRecordableDateRange", () => {
  it("ロックがなければ今日までを選べる", () => {
    expect(
      resolveRecordableDateRange({
        lockState: { isLocked: false, lockedThrough: null },
        today: "2026-10-13",
      }),
    ).toEqual({ min: undefined, max: "2026-10-13" });
  });

  it("ロック済みなら、ロック最終日の翌日から選べる（月末・年末もまたぐ）", () => {
    expect(
      resolveRecordableDateRange({
        lockState: { isLocked: true, lockedThrough: "2025-12-31" },
        today: "2026-10-13",
      }),
    ).toEqual({ min: "2026-01-01", max: "2026-10-13" });
    expect(
      resolveRecordableDateRange({
        lockState: { isLocked: true, lockedThrough: "2024-02-28" },
        today: "2026-10-13",
      }).min,
    ).toBe("2024-02-29");
  });

  it("帳簿の読み込み前は今日までだけを制限する", () => {
    expect(resolveRecordableDateRange({ today: "2026-10-13" })).toEqual({
      min: undefined,
      max: "2026-10-13",
    });
  });
});
