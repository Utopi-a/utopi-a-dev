import { describe, expect, it } from "vitest";
import { defaultUnlicensedQuotaPeriod } from "./default-unlicensed-quota-period";

describe("defaultUnlicensedQuotaPeriod", () => {
  it("狩猟は今日を含む猟期（10月15日から翌年4月15日）にする", () => {
    expect(defaultUnlicensedQuotaPeriod({ purpose: "hunting", today: "2026-11-14" })).toEqual({
      startsOn: "2026-10-15",
      endsOn: "2027-04-15",
    });
  });

  it("1月から4月15日までは前年に始まった猟期にする", () => {
    expect(defaultUnlicensedQuotaPeriod({ purpose: "hunting", today: "2027-04-15" })).toEqual({
      startsOn: "2026-10-15",
      endsOn: "2027-04-15",
    });
  });

  it("猟期前の夏は次の猟期にする", () => {
    expect(defaultUnlicensedQuotaPeriod({ purpose: "hunting", today: "2027-04-16" })).toEqual({
      startsOn: "2027-10-15",
      endsOn: "2028-04-15",
    });
  });

  it("有害鳥獣駆除は今日から1年にする", () => {
    expect(defaultUnlicensedQuotaPeriod({ purpose: "pest_control", today: "2026-11-14" })).toEqual({
      startsOn: "2026-11-14",
      endsOn: "2027-11-13",
    });
  });
});
