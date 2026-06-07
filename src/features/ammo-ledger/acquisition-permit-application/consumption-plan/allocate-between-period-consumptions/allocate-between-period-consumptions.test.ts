import { describe, expect, it } from "vitest";
import { comparePlanPeriod } from "../plan-period/plan-period";
import {
  allocateConsumptionAcrossPurchaseGaps,
  buildPurchaseGaps,
} from "./allocate-between-period-consumptions";

describe("allocateConsumptionAcrossPurchaseGaps", () => {
  const gaps = [
    {
      periods: [
        { year: 2026, month: 4, period: "下旬" as const },
        { year: 2026, month: 5, period: "上旬" as const },
        { year: 2026, month: 5, period: "中旬" as const },
        { year: 2026, month: 5, period: "下旬" as const },
      ],
    },
    {
      periods: [
        { year: 2026, month: 10, period: "中旬" as const },
        { year: 2026, month: 10, period: "下旬" as const },
        { year: 2026, month: 11, period: "上旬" as const },
      ],
    },
  ];

  it("購入間隙間ごとに消費を配分する", () => {
    const assignments = allocateConsumptionAcrossPurchaseGaps({
      gaps,
      shootingQuantity: 1000,
      maxPerPeriod: 125,
      consumptionUnit: 25,
    });

    const firstGapAssignments = assignments.filter(
      (item) =>
        comparePlanPeriod({ a: item.period, b: { year: 2026, month: 6, period: "上旬" } }) < 0,
    );
    const secondGapAssignments = assignments.filter(
      (item) =>
        comparePlanPeriod({ a: item.period, b: { year: 2026, month: 10, period: "上旬" } }) >= 0,
    );

    expect(firstGapAssignments.reduce((sum, item) => sum + item.quantity, 0)).toBeGreaterThan(0);
    expect(secondGapAssignments.reduce((sum, item) => sum + item.quantity, 0)).toBeGreaterThan(0);
    expect(assignments.reduce((sum, item) => sum + item.quantity, 0)).toBe(1000);
  });

  it("1枠1回を基本に配分する", () => {
    const assignments = allocateConsumptionAcrossPurchaseGaps({
      gaps,
      shootingQuantity: 700,
      maxPerPeriod: 125,
      consumptionUnit: 25,
    });

    expect(assignments.reduce((sum, item) => sum + item.quantity, 0)).toBe(700);
    expect(assignments.every((item) => item.quantity % 25 === 0)).toBe(true);
  });

  it("上限500に偏らず125前後の塊になる", () => {
    const assignments = allocateConsumptionAcrossPurchaseGaps({
      gaps,
      shootingQuantity: 700,
      maxPerPeriod: 500,
      consumptionUnit: 25,
    });

    expect(assignments.some((item) => item.quantity < 500)).toBe(true);
    expect(assignments.every((item) => item.quantity <= 500)).toBe(true);
  });
});

describe("buildPurchaseGaps", () => {
  it("購入ペアごとに隙間を作る", () => {
    const gaps = buildPurchaseGaps({
      acquisitions: [
        { scheduledPeriod: { year: 2026, month: 4, period: "上旬" }, quantity: 500 },
        { scheduledPeriod: { year: 2026, month: 10, period: "上旬" }, quantity: 500 },
      ],
      availablePeriods: [
        { year: 2026, month: 4, period: "上旬" },
        { year: 2026, month: 4, period: "中旬" },
        { year: 2026, month: 5, period: "上旬" },
        { year: 2026, month: 10, period: "上旬" },
        { year: 2026, month: 10, period: "中旬" },
      ],
    });

    expect(gaps).toHaveLength(1);
    expect(gaps[0].periods).toEqual([
      { year: 2026, month: 4, period: "中旬" },
      { year: 2026, month: 5, period: "上旬" },
      { year: 2026, month: 10, period: "上旬" },
    ]);
  });
});
