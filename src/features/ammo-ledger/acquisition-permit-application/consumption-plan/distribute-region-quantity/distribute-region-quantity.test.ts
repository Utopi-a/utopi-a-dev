import { describe, expect, it } from "vitest";
import { distributeQuantityInRegionWithStablePace } from "./distribute-region-quantity";

describe("distributeQuantityInRegionWithStablePace", () => {
  it("500を3枠に425/75/75のような偏りなく配分する", () => {
    const assignments = distributeQuantityInRegionWithStablePace({
      periods: [
        { year: 2026, month: 5, period: "上旬" },
        { year: 2026, month: 5, period: "中旬" },
        { year: 2026, month: 5, period: "下旬" },
      ],
      totalQuantity: 500,
      maxPerPeriod: 125,
      consumptionUnit: 25,
    });

    expect(assignments.reduce((sum, item) => sum + item.quantity, 0)).toBe(500);
    expect(assignments.map((item) => item.quantity)).toEqual([175, 175, 150]);
  });
});
