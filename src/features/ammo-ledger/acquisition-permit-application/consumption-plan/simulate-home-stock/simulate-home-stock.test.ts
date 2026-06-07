import { describe, expect, it } from "vitest";
import { simulateHomeStock } from "./simulate-home-stock";

describe("simulateHomeStock", () => {
  it("購入の直後に消費する順で在庫推移を計算する", () => {
    const result = simulateHomeStock({
      initialStock: 300,
      acquisitions: [
        {
          scheduledPeriod: { year: 2026, month: 5, period: "上旬" },
          quantity: 250,
          slotSequence: 0,
        },
      ],
      shootingConsumptions: [
        {
          scheduledPeriod: { year: 2026, month: 5, period: "上旬" },
          quantity: 250,
          slotSequence: 0,
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
