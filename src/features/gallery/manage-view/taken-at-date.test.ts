import { describe, expect, it } from "vitest";
import { replaceTakenAtDate, takenAtToDateInputValue } from "./taken-at-date";

describe("takenAtToDateInputValue", () => {
  it("撮影日時を端末の現地時刻の日付にする", () => {
    const takenAt = new Date(2026, 0, 5, 23, 30).toISOString();
    expect(takenAtToDateInputValue({ takenAt })).toBe("2026-01-05");
  });

  it("撮影日時が無ければ空にする", () => {
    expect(takenAtToDateInputValue({ takenAt: null })).toBe("");
  });
});

describe("replaceTakenAtDate", () => {
  it("元の時刻を保ったまま日付だけを差し替える", () => {
    const takenAt = new Date(2026, 0, 5, 23, 30, 15).toISOString();
    expect(replaceTakenAtDate({ takenAt, date: "2026-02-14" })).toBe(
      new Date(2026, 1, 14, 23, 30, 15).toISOString(),
    );
  });

  it("元の撮影日時が無ければ 12:00 にする", () => {
    expect(replaceTakenAtDate({ takenAt: null, date: "2026-11-10" })).toBe(
      new Date(2026, 10, 10, 12, 0, 0).toISOString(),
    );
  });

  it("日付を空にしたら null にする", () => {
    const takenAt = new Date(2026, 0, 5).toISOString();
    expect(replaceTakenAtDate({ takenAt, date: "" })).toBeNull();
  });

  it("入力の日付と戻した日付が一致する", () => {
    const takenAt = replaceTakenAtDate({ takenAt: null, date: "2026-03-01" });
    expect(takenAtToDateInputValue({ takenAt })).toBe("2026-03-01");
  });
});
