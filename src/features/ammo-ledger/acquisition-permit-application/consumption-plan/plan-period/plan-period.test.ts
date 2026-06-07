import { describe, expect, it } from "vitest";
import {
  distributePlanPeriodsEvenly,
  formatPlanPeriodLabel,
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
