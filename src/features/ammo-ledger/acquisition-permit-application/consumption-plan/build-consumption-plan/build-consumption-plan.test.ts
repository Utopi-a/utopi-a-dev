import { describe, expect, it } from "vitest";
import { isPlanPeriodWithinRange } from "../plan-period/plan-period";
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
    expect(
      plan.warnings.some((warning) => warning.includes("購入と購入の間に消費がありません")),
    ).toBe(false);

    const consumptionRows = plan.rows.filter((row) => !row.isAcquisition);
    const consumptionQuantities = consumptionRows.map((row) => row.consumptionQuantity);

    expect(consumptionQuantities.every((quantity) => quantity >= 250)).toBe(true);
    expect(consumptionQuantities.every((quantity) => quantity <= 550)).toBe(true);
    expect(consumptionQuantities.some((quantity) => quantity < 500)).toBe(true);

    const lastAcquisition = plan.rows.filter((row) => row.isAcquisition).at(-1)!;
    expect(
      isPlanPeriodWithinRange({
        period: lastAcquisition.scheduledPeriod,
        from: "2026-04-01",
        to: "2027-03-31",
      }),
    ).toBe(true);
  });

  it("50000発でも計画を生成できる", () => {
    const plan = buildConsumptionPlan({
      requestedQuantity: 50000,
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
          weight: 1,
        },
      ],
    });

    expect(plan.totalAcquisition).toBe(50000);
    expect(plan.totalConsumption).toBe(50000);
    expect(plan.peakHomeStock).toBeLessThanOrEqual(800);

    const consumptionQuantities = plan.rows
      .filter((row) => !row.isAcquisition)
      .map((row) => row.consumptionQuantity);
    expect(consumptionQuantities.every((quantity) => quantity >= 250)).toBe(true);
  });
});
