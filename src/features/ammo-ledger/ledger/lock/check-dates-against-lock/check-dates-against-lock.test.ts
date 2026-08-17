import { describe, expect, it } from "vitest";
import { checkDatesAgainstLock } from "./check-dates-against-lock";

describe("checkDatesAgainstLock", () => {
  it("ロック無しなら全日付を許可する", () => {
    const result = checkDatesAgainstLock({
      lockState: { isLocked: false, lockedThrough: null },
      dates: ["2025-01-01", "2025-06-15", "2025-12-31"],
    });
    expect(result).toEqual({ blocked: false });
  });

  it("ロック日以前の日付があればブロックする", () => {
    const result = checkDatesAgainstLock({
      lockState: { isLocked: true, lockedThrough: "2025-06-30" },
      dates: ["2025-07-01", "2025-06-30"],
    });
    expect(result).toEqual({ blocked: true, lockedThrough: "2025-06-30" });
  });

  it("ロック日より後の日付のみなら許可する", () => {
    const result = checkDatesAgainstLock({
      lockState: { isLocked: true, lockedThrough: "2025-06-30" },
      dates: ["2025-07-01", "2025-08-01"],
    });
    expect(result).toEqual({ blocked: false });
  });

  it("ロック日と同日の日付はブロックする", () => {
    const result = checkDatesAgainstLock({
      lockState: { isLocked: true, lockedThrough: "2025-03-31" },
      dates: ["2025-03-31"],
    });
    expect(result).toEqual({ blocked: true, lockedThrough: "2025-03-31" });
  });

  it("空の日付配列なら許可する", () => {
    const result = checkDatesAgainstLock({
      lockState: { isLocked: true, lockedThrough: "2025-12-31" },
      dates: [],
    });
    expect(result).toEqual({ blocked: false });
  });

  it("最初にヒットしたロック日で即座にブロック結果を返す", () => {
    const result = checkDatesAgainstLock({
      lockState: { isLocked: true, lockedThrough: "2025-06-30" },
      dates: ["2025-01-01", "2025-12-31"],
    });
    expect(result).toEqual({ blocked: true, lockedThrough: "2025-06-30" });
  });
});
