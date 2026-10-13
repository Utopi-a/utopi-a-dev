import { describe, expect, it } from "vitest";
import { isBannerSnoozed, resolveBannerDismissedAt } from "./resolve-banner-dismissal";

const day = 24 * 60 * 60 * 1000;
const now = Date.parse("2026-10-13T00:00:00Z");

describe("resolveBannerDismissedAt", () => {
  it("保存した時刻をそのまま返す", () => {
    expect(resolveBannerDismissedAt({ storedValue: String(now - day), now })).toBe(now - day);
  });

  it("以前の版の true は、初めて読んだ時刻に押したものとみなす", () => {
    expect(resolveBannerDismissedAt({ storedValue: "true", now })).toBe(now);
  });

  it.each([null, "", "later"])("保存値 %s は未操作として扱う", (storedValue) => {
    expect(resolveBannerDismissedAt({ storedValue, now })).toBeNull();
  });
});

describe("isBannerSnoozed", () => {
  it("「後で」から30日間は出さず、30日たったら再び出す", () => {
    expect(isBannerSnoozed({ dismissedAt: now - 30 * day + 1, now })).toBe(true);
    expect(isBannerSnoozed({ dismissedAt: now - 30 * day, now })).toBe(false);
  });

  it("一度も「後で」を押していなければ出す", () => {
    expect(isBannerSnoozed({ dismissedAt: null, now })).toBe(false);
  });

  it("以前の版で「後で」を押した利用者には、更新後30日は出さない", () => {
    const dismissedAt = resolveBannerDismissedAt({ storedValue: "true", now });
    expect(isBannerSnoozed({ dismissedAt, now: now + 29 * day })).toBe(true);
    expect(isBannerSnoozed({ dismissedAt, now: now + 30 * day })).toBe(false);
  });
});
