import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { computePeriodEndIsoDate } from "./compute-period-end-iso-date";

const originalTimeZone = process.env.TZ;

describe.each([
  "UTC",
  "Asia/Tokyo",
  "America/Los_Angeles",
])("computePeriodEndIsoDate（TZ=%s）", (timeZone) => {
  beforeEach(() => {
    process.env.TZ = timeZone;
  });

  afterEach(() => {
    if (originalTimeZone === undefined) delete process.env.TZ;
    else process.env.TZ = originalTimeZone;
  });

  it("1年の期間は1年後の前日に終わる", () => {
    expect(computePeriodEndIsoDate({ startsOn: "2026-09-10", years: 1 })).toBe("2027-09-09");
  });

  it("1月1日からの1年は同じ年の12月31日に終わる", () => {
    expect(computePeriodEndIsoDate({ startsOn: "2027-01-01", years: 1 })).toBe("2027-12-31");
  });

  it("3月1日からの1年は、うるう年なら2月29日に終わる", () => {
    expect(computePeriodEndIsoDate({ startsOn: "2027-03-01", years: 1 })).toBe("2028-02-29");
    expect(computePeriodEndIsoDate({ startsOn: "2026-03-01", years: 1 })).toBe("2027-02-28");
  });

  it("2月29日からの1年は、応当日がないため翌年の2月28日に終わる", () => {
    expect(computePeriodEndIsoDate({ startsOn: "2028-02-29", years: 1 })).toBe("2029-02-28");
  });
});
