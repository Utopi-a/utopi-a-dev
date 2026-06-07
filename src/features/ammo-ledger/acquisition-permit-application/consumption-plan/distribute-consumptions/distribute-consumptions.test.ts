import { describe, expect, it } from "vitest";
import { distributeConsumptions } from "./distribute-consumptions";

const ranges = [
  {
    rangeId: "range-a",
    rangeName: "A射撃場",
    rangeAddress: "茨城県A",
    purpose: "標的射撃" as const,
    weight: 2,
  },
  {
    rangeId: "range-b",
    rangeName: "B射撃場",
    rangeAddress: "茨城県B",
    purpose: "標的射撃" as const,
    weight: 1,
  },
];

describe("distributeConsumptions", () => {
  it("25発単位で射撃場 weight に比例配分する", () => {
    const events = distributeConsumptions({
      requestedQuantity: 300,
      periodFrom: "2026-04-01",
      periodTo: "2026-06-30",
      rangeAllocations: ranges,
      consumptionUnit: 25,
    });

    expect(events).toHaveLength(12);
    expect(events.reduce((sum, event) => sum + event.quantity, 0)).toBe(300);

    const byRange = events.reduce<Record<string, number>>((acc, event) => {
      acc[event.rangeId] = (acc[event.rangeId] ?? 0) + event.quantity;
      return acc;
    }, {});

    expect(byRange["range-a"]).toBe(200);
    expect(byRange["range-b"]).toBe(100);
  });
});
