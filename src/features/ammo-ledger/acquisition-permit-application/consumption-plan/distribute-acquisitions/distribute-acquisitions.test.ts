import { describe, expect, it } from "vitest";
import { distributeAcquisitions, distributeDatesEvenly } from "./distribute-acquisitions";

describe("distributeDatesEvenly", () => {
  it("1件なら開始日を返す", () => {
    expect(
      distributeDatesEvenly({
        from: "2026-04-01",
        to: "2027-03-31",
        count: 1,
      }),
    ).toEqual(["2026-04-01"]);
  });

  it("期間内に均等配置する", () => {
    const dates = distributeDatesEvenly({
      from: "2026-04-01",
      to: "2026-04-03",
      count: 3,
    });
    expect(dates).toEqual(["2026-04-01", "2026-04-02", "2026-04-03"]);
  });
});

describe("distributeAcquisitions", () => {
  it("5000発を250発単位で20回に分割する", () => {
    const events = distributeAcquisitions({
      requestedQuantity: 5000,
      periodFrom: "2026-04-01",
      periodTo: "2027-03-31",
      purchaseUnit: 250,
    });

    expect(events).toHaveLength(20);
    expect(events.reduce((sum, event) => sum + event.quantity, 0)).toBe(5000);
    expect(events.every((event) => event.quantity === 250)).toBe(true);
  });

  it("端数を最後の1回に載せる", () => {
    const events = distributeAcquisitions({
      requestedQuantity: 300,
      periodFrom: "2026-04-01",
      periodTo: "2026-06-30",
      purchaseUnit: 250,
    });

    expect(events).toEqual([
      { date: "2026-04-01", quantity: 250 },
      { date: "2026-06-30", quantity: 50 },
    ]);
  });
});
