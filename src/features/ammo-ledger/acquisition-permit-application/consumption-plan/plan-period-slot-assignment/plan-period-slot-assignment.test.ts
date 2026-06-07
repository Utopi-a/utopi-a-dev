import { describe, expect, it } from "vitest";
import { buildBalancedPeriodSlots, resolveMaxSlotsPerPeriod } from "./plan-period-slot-assignment";

describe("resolveMaxSlotsPerPeriod", () => {
  it("足りなければ同一区間の2回目を許可する", () => {
    expect(
      resolveMaxSlotsPerPeriod({
        periodCount: 3,
        eventCount: 5,
      }),
    ).toBe(2);
  });
});

describe("buildBalancedPeriodSlots", () => {
  it("同一区間への2回目を均等に割り当てる", () => {
    const periods = [
      { year: 2026, month: 4, period: "上旬" as const },
      { year: 2026, month: 4, period: "中旬" as const },
      { year: 2026, month: 4, period: "下旬" as const },
    ];

    const slots = buildBalancedPeriodSlots({
      periods,
      slotCount: 5,
      maxSlotsPerPeriod: 2,
    });

    expect(slots).toHaveLength(5);
    expect(slots.filter((period) => period.period === "上旬")).toHaveLength(2);
    expect(slots.filter((period) => period.period === "中旬")).toHaveLength(2);
    expect(slots.filter((period) => period.period === "下旬")).toHaveLength(1);
  });
});
