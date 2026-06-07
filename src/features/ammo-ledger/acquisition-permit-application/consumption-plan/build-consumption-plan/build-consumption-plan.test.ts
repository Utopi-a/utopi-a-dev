import { describe, expect, it } from "vitest";
import { buildConsumptionPlan } from "./build-consumption-plan";

describe("buildConsumptionPlan", () => {
  it("典型入力で5000発・800発以内の計画を返す", () => {
    const plan = buildConsumptionPlan({
      requestedQuantity: 5000,
      periodFrom: "2026-04-01",
      periodTo: "2027-03-31",
      currentHomeStock: 300,
      counterpartyName: "テスト銃砲店",
      counterpartyAddress: "茨城県",
      rangeAllocations: [
        {
          rangeId: "range-a",
          rangeName: "A射撃場",
          rangeAddress: "茨城県A",
          purpose: "標的射撃",
          weight: 2,
        },
        {
          rangeId: "range-b",
          rangeName: "B射撃場",
          rangeAddress: "茨城県B",
          purpose: "標的射撃",
          weight: 1,
        },
      ],
    });

    expect(plan.totalAcquisition).toBe(5000);
    expect(plan.totalConsumption).toBe(5000);
    expect(plan.peakHomeStock).toBeLessThanOrEqual(800);
    expect(plan.rows.length).toBeLessThan(30);
    expect(plan.rows.every((row) => row.acquisitionQuantity % 250 === 0)).toBe(true);
    expect(
      plan.rows.every((row) => row.consumptionQuantity === 0 || row.consumptionQuantity % 25 === 0),
    ).toBe(true);
  });
});
