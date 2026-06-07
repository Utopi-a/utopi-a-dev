import { describe, expect, it } from "vitest";
import { distributeAcquisitions } from "./distribute-acquisitions";

describe("distributeAcquisitions", () => {
  it("5000発を250倍数の少数回にまとめる", () => {
    const events = distributeAcquisitions({
      requestedQuantity: 5000,
      periodFrom: "2026-04-01",
      periodTo: "2027-03-31",
      purchaseUnit: 250,
    });

    expect(events.length).toBeLessThan(20);
    expect(events.reduce((sum, event) => sum + event.quantity, 0)).toBe(5000);
    expect(events.every((event) => event.quantity % 250 === 0)).toBe(true);
    expect(events.some((event) => event.quantity >= 500)).toBe(true);
  });

  it("500発なら1回の購入にまとめる", () => {
    const events = distributeAcquisitions({
      requestedQuantity: 500,
      periodFrom: "2026-04-01",
      periodTo: "2026-06-30",
      purchaseUnit: 250,
    });

    expect(events).toEqual([
      {
        scheduledPeriod: { year: 2026, month: 4, period: "上旬" },
        quantity: 500,
      },
    ]);
  });
});
