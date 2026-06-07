import { describe, expect, it } from "vitest";
import { rebalanceConsumptionsForHomeStorage, simulateHomeStock } from "./simulate-home-stock";

describe("simulateHomeStock", () => {
  it("購入と消費から在庫推移を計算する", () => {
    const result = simulateHomeStock({
      initialStock: 300,
      acquisitions: [{ date: "2026-05-01", quantity: 250 }],
      consumptions: [
        {
          date: "2026-06-01",
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
      { date: "2026-05-01", quantity: 250 },
      { date: "2026-06-01", quantity: 250 },
      { date: "2026-07-01", quantity: 250 },
    ];
    const consumptions = [
      {
        date: "2026-12-01",
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
    expect(rebalanced.some((event) => event.date <= "2026-07-01")).toBe(true);
  });
});
