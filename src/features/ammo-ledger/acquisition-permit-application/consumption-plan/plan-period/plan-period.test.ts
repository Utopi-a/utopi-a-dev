import { describe, expect, it } from "vitest";
import {
  computeMaxConsumptionPerPlanPeriod,
  distributePlanPeriodsEvenly,
  formatPlanPeriodLabel,
  isPlanPeriodWithinRange,
  listPlanPeriodsInRange,
} from "./plan-period";

describe("listPlanPeriodsInRange", () => {
  it("期間内の月を上中下旬で列挙する", () => {
    const periods = listPlanPeriodsInRange({
      from: "2026-04-01",
      to: "2026-06-30",
    });

    expect(periods).toHaveLength(9);
    expect(periods[0]).toEqual({ year: 2026, month: 4, period: "上旬" });
    expect(periods.at(-1)).toEqual({ year: 2026, month: 6, period: "下旬" });
  });

  it("開始日より前の上旬を除外する", () => {
    const periods = listPlanPeriodsInRange({
      from: "2026-04-12",
      to: "2026-06-30",
    });

    expect(periods[0]).toEqual({ year: 2026, month: 4, period: "中旬" });
  });

  it("終了日より後の下旬を除外する", () => {
    const periods = listPlanPeriodsInRange({
      from: "2026-04-01",
      to: "2027-03-15",
    });

    expect(periods.at(-1)).toEqual({ year: 2027, month: 3, period: "中旬" });
    expect(
      periods.some(
        (period) => period.year === 2027 && period.month === 3 && period.period === "下旬",
      ),
    ).toBe(false);
  });
});

describe("isPlanPeriodWithinRange", () => {
  it("代表日が期間内なら true", () => {
    expect(
      isPlanPeriodWithinRange({
        period: { year: 2027, month: 3, period: "中旬" },
        from: "2026-04-01",
        to: "2027-03-15",
      }),
    ).toBe(true);
  });
});

describe("distributePlanPeriodsEvenly", () => {
  it("3件なら期間内に均等配置する", () => {
    const periods = distributePlanPeriodsEvenly({
      from: "2026-04-01",
      to: "2026-06-30",
      count: 3,
    });

    expect(periods).toEqual([
      { year: 2026, month: 4, period: "上旬" },
      { year: 2026, month: 5, period: "中旬" },
      { year: 2026, month: 6, period: "下旬" },
    ]);
  });

  it("最終スロットが譲受終了日以前になる", () => {
    const periods = distributePlanPeriodsEvenly({
      from: "2026-04-01",
      to: "2027-03-15",
      count: 5,
    });

    expect(
      isPlanPeriodWithinRange({
        period: periods.at(-1)!,
        from: "2026-04-01",
        to: "2027-03-15",
      }),
    ).toBe(true);
  });
});

describe("formatPlanPeriodLabel", () => {
  it("表示用ラベルを返す", () => {
    expect(
      formatPlanPeriodLabel({
        value: { year: 2026, month: 4, period: "上旬" },
      }),
    ).toBe("2026年4月上旬");
  });
});

describe("computeMaxConsumptionPerPlanPeriod", () => {
  it("許可申請数÷上中下旬数を25発単位で切り捨てる", () => {
    expect(
      computeMaxConsumptionPerPlanPeriod({
        requestedQuantity: 5000,
        periodFrom: "2026-04-01",
        periodTo: "2027-03-31",
      }),
    ).toBe(125);
  });
});
