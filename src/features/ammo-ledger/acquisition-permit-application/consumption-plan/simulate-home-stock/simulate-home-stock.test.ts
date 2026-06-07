import { describe, expect, it } from "vitest";
import { comparePlanPeriod } from "../plan-period/plan-period";
import { rebalanceConsumptionsForHomeStorage, simulateHomeStock } from "./simulate-home-stock";

describe("simulateHomeStock", () => {
  it("購入と消費から在庫推移を計算する", () => {
    const result = simulateHomeStock({
      initialStock: 300,
      acquisitions: [
        {
          scheduledPeriod: { year: 2026, month: 5, period: "上旬" },
          quantity: 250,
        },
      ],
      consumptions: [
        {
          scheduledPeriod: { year: 2026, month: 6, period: "上旬" },
          quantity: 250,
          rangeId: "r1",
          rangeName: "A",
          rangeAddress: "addr",
          purpose: "標的射撃",
        },
      ],
    });

    expect(result.peakHomeStock).toBe(550);
  });
});

describe("rebalanceConsumptionsForHomeStorage", () => {
  it("800発を超える場合は消費を前倒しする", () => {
    const acquisitions = [
      { scheduledPeriod: { year: 2026, month: 5, period: "上旬" as const }, quantity: 250 },
      { scheduledPeriod: { year: 2026, month: 6, period: "上旬" as const }, quantity: 250 },
      { scheduledPeriod: { year: 2026, month: 7, period: "上旬" as const }, quantity: 250 },
    ];
    const consumptions = [
      {
        scheduledPeriod: { year: 2026, month: 12, period: "上旬" as const },
        quantity: 750,
        rangeId: "r1",
        rangeName: "A",
        rangeAddress: "addr",
        purpose: "標的射撃" as const,
      },
    ];

    const rebalanced = rebalanceConsumptionsForHomeStorage({
      initialStock: 600,
      homeStorageLimit: 800,
      acquisitions,
      consumptions,
    });

    const simulation = simulateHomeStock({
      initialStock: 600,
      acquisitions,
      consumptions: rebalanced,
    });

    expect(simulation.peakHomeStock).toBeLessThanOrEqual(800);
    expect(
      rebalanced.some(
        (event) =>
          comparePlanPeriod({
            a: event.scheduledPeriod,
            b: { year: 2026, month: 7, period: "下旬" },
          }) <= 0,
      ),
    ).toBe(true);
  });
});
