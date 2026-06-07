import { describe, expect, it } from "vitest";
import {
  choosePurchaseAmount,
  hasConsecutivePurchasesWithoutConsumption,
  scheduleAcquisitions,
  splitIntoPurchaseChunks,
} from "./schedule-acquisitions";

describe("splitIntoPurchaseChunks", () => {
  it("500を優先して分割する", () => {
    expect(
      splitIntoPurchaseChunks({
        totalQuantity: 1250,
        purchaseUnit: 250,
        maxChunk: 500,
      }),
    ).toEqual([500, 500, 250]);
  });
});

describe("choosePurchaseAmount", () => {
  it("買うなら500を優先する", () => {
    expect(
      choosePurchaseAmount({
        need: 150,
        remaining: 5000,
        room: 800,
      }),
    ).toBe(500);
  });
});

describe("scheduleAcquisitions", () => {
  it("期間内に500/250で購入を配置する", () => {
    const acquisitions = scheduleAcquisitions({
      requestedQuantity: 5000,
      periodFrom: "2026-04-01",
      periodTo: "2027-03-31",
      initialStock: 300,
      homeStorageLimit: 800,
    });

    expect(acquisitions.reduce((sum, event) => sum + event.quantity, 0)).toBe(5000);
    expect(acquisitions.every((event) => event.quantity === 250 || event.quantity === 500)).toBe(
      true,
    );
  });

  it("枠数より購入が多い場合は同一区間に2回目を許可する", () => {
    const acquisitions = scheduleAcquisitions({
      requestedQuantity: 2500,
      periodFrom: "2026-04-01",
      periodTo: "2026-04-30",
      initialStock: 0,
      homeStorageLimit: 800,
    });

    const periodKeys = acquisitions.map(
      (event) =>
        `${event.scheduledPeriod.year}-${event.scheduledPeriod.month}-${event.scheduledPeriod.period}`,
    );

    expect(new Set(periodKeys).size).toBeLessThan(periodKeys.length);
  });
});

describe("hasConsecutivePurchasesWithoutConsumption", () => {
  it("購入の間に消費がなければ true", () => {
    expect(
      hasConsecutivePurchasesWithoutConsumption({
        acquisitions: [
          { scheduledPeriod: { year: 2026, month: 4, period: "上旬" }, quantity: 500 },
          { scheduledPeriod: { year: 2026, month: 5, period: "上旬" }, quantity: 500 },
        ],
        consumptions: [],
      }),
    ).toBe(true);
  });

  it("購入の間に消費があれば false", () => {
    expect(
      hasConsecutivePurchasesWithoutConsumption({
        acquisitions: [
          { scheduledPeriod: { year: 2026, month: 4, period: "上旬" }, quantity: 500 },
          { scheduledPeriod: { year: 2026, month: 5, period: "上旬" }, quantity: 500 },
        ],
        consumptions: [
          {
            scheduledPeriod: { year: 2026, month: 4, period: "下旬" },
            quantity: 250,
            rangeId: "r1",
            rangeName: "A",
            rangeAddress: "addr",
            purpose: "標的射撃",
          },
        ],
      }),
    ).toBe(false);
  });
});
