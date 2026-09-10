import { describe, expect, it } from "vitest";
import { isPlanPeriodWithinRange } from "../plan-period/plan-period";
import { buildConsumptionPlan } from "./build-consumption-plan";

describe("buildConsumptionPlan", () => {
  it.each([
    0, 300, 301, 550, 755, 800,
  ])("在庫 %i 発から各行の残数を0〜800発に保つ", (currentHomeStock) => {
    const plan = buildConsumptionPlan({
      requestedQuantity: 5000,
      periodFrom: "2026-04-01",
      periodTo: "2027-03-31",
      currentHomeStock,
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
    let stock = currentHomeStock;
    for (const row of plan.rows) {
      stock += row.acquisitionQuantity - row.consumptionQuantity;
      expect(stock, `行 ${row.rowIndex}`).toBeGreaterThanOrEqual(0);
      expect(stock, `行 ${row.rowIndex}`).toBeLessThanOrEqual(800);
    }
    expect(plan.totalAcquisition).toBe(5000);
    expect(plan.totalConsumption).toBe(5000);
    expect(stock).toBe(currentHomeStock);
  });

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
    const regularConsumptions = consumptionQuantities.slice(0, -1);
    const lastConsumption = consumptionQuantities.at(-1);

    expect(regularConsumptions.every((quantity) => quantity >= 250)).toBe(true);
    expect(regularConsumptions.every((quantity) => quantity <= 550)).toBe(true);
    expect(lastConsumption).toBeGreaterThanOrEqual(25);
    expect(consumptionQuantities.some((quantity) => quantity < 500)).toBe(true);

    const lastAcquisition = plan.rows.filter((row) => row.isAcquisition).at(-1);
    if (!lastAcquisition) throw new Error("購入行がありません");
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
    expect(consumptionQuantities.every((quantity) => quantity <= 550)).toBe(true);
    expect(
      plan.warnings.some((warning) => warning.includes("消費のないまま購入が連続しています")),
    ).toBe(false);
  });
});

const baseInput = {
  requestedQuantity: 5000,
  currentHomeStock: 755,
  periodFrom: "2026-04-01",
  periodTo: "2027-03-31",
  counterpartyName: "テスト銃砲店",
  counterpartyAddress: "茨城県",
  rangeAllocations: [
    {
      rangeId: "a",
      rangeName: "A射撃場",
      rangeAddress: "茨城県A",
      purpose: "標的射撃" as const,
      weight: 2,
    },
    {
      rangeId: "b",
      rangeName: "B射撃場",
      rangeAddress: "茨城県B",
      purpose: "標的射撃" as const,
      weight: 1,
    },
  ],
};

describe("消費計画の境界と全行の契約", () => {
  it.each([
    { currentHomeStock: 755, requestedQuantity: 250, quantities: [-225, 250, -25], peak: 780 },
    { currentHomeStock: 755, requestedQuantity: 500, quantities: [-475, 500, -25], peak: 780 },
    { currentHomeStock: 800, requestedQuantity: 250, quantities: [-250, 250], peak: 800 },
    { currentHomeStock: 799, requestedQuantity: 500, quantities: [-500, 500], peak: 799 },
    { currentHomeStock: 300, requestedQuantity: 500, quantities: [500, -500], peak: 800 },
    { currentHomeStock: 0, requestedQuantity: 250, quantities: [250, -250], peak: 250 },
  ])("在庫 $currentHomeStock / 申請 $requestedQuantity の購入前後の数量", ({
    currentHomeStock,
    requestedQuantity,
    quantities,
    peak,
  }) => {
    const plan = buildConsumptionPlan({
      ...baseInput,
      currentHomeStock,
      requestedQuantity,
      rangeAllocations: [baseInput.rangeAllocations[0]],
    });
    expect(plan.rows.map((row) => row.acquisitionQuantity - row.consumptionQuantity)).toEqual(
      quantities,
    );
    expect(plan.peakHomeStock).toBe(peak);
    expect(plan.warnings).toEqual([]);
  });

  it.each([
    250, 500, 750, 1000, 1250, 5000,
  ])("申請 %i 発について初期在庫0〜800発の全801通り", (requestedQuantity) => {
    for (let currentHomeStock = 0; currentHomeStock <= 800; currentHomeStock += 1) {
      assertPlanContract({ ...baseInput, requestedQuantity, currentHomeStock });
    }
  });

  it.each([
    ["2026-04-05", "2026-04-05"],
    ["2026-04-01", "2026-04-30"],
    ["2026-12-20", "2027-01-31"],
  ])("短期・同一旬・年またぎ %s〜%s", (periodFrom, periodTo) => {
    for (const currentHomeStock of [
      0, 1, 24, 25, 299, 300, 301, 549, 550, 551, 749, 750, 751, 755, 775, 799, 800,
    ]) {
      for (const requestedQuantity of [250, 500, 750, 1000, 1250, 5000, 50000]) {
        assertPlanContract({
          ...baseInput,
          requestedQuantity,
          currentHomeStock,
          periodFrom,
          periodTo,
        });
      }
    }
  });

  it("射撃場別の数量・住所・目的を保ち、購入前の消費も比率に含める", () => {
    const plan = buildConsumptionPlan({
      ...baseInput,
      requestedQuantity: 1000,
      rangeAllocations: [
        baseInput.rangeAllocations[0],
        { ...baseInput.rangeAllocations[1], purpose: "狩猟（鳥獣の捕獲）" },
      ],
    });
    const consumptionRows = plan.rows.filter((row) => !row.isAcquisition);
    expect(
      consumptionRows
        .filter((row) => row.locationName === "A射撃場")
        .reduce((sum, row) => sum + row.consumptionQuantity, 0),
    ).toBe(675);
    expect(
      consumptionRows
        .filter((row) => row.locationName === "B射撃場")
        .reduce((sum, row) => sum + row.consumptionQuantity, 0),
    ).toBe(325);
    expect(
      consumptionRows
        .filter((row) => row.locationName === "B射撃場")
        .map((row) => [row.locationAddress, row.purpose]),
    ).toEqual([["茨城県B", "狩猟（鳥獣の捕獲）"]]);
  });

  it.each([
    { currentHomeStock: 801 },
    { currentHomeStock: -1 },
    { currentHomeStock: 0.5 },
    { requestedQuantity: 0 },
    { requestedQuantity: -250 },
    { requestedQuantity: 755 },
    { requestedQuantity: Number.POSITIVE_INFINITY },
    { currentHomeStock: Number.NaN },
    {
      rangeAllocations: baseInput.rangeAllocations.map((range) => ({
        ...range,
        weight: Number.MAX_VALUE,
      })),
    },
    { purchaseUnit: 0 },
    { consumptionUnit: 0 },
    { consumptionUnit: 30 },
    { rangeAllocations: [] },
    { rangeAllocations: [{ ...baseInput.rangeAllocations[0], weight: 0 }] },
    { rangeAllocations: [baseInput.rangeAllocations[0], baseInput.rangeAllocations[0]] },
    { periodFrom: "2027-04-01" },
  ])("成立しない入力には空の計画と警告を返す: %j", (patch) => {
    const plan = buildConsumptionPlan({ ...baseInput, ...patch });
    expect(plan.rows).toEqual([]);
    expect(plan.totalAcquisition).toBe(0);
    expect(plan.totalConsumption).toBe(0);
    expect(plan.warnings.length).toBeGreaterThan(0);
  });

  it("有限な大きい比率でも単位数の乗算がオーバーフローしない", () => {
    const input = {
      ...baseInput,
      rangeAllocations: baseInput.rangeAllocations.map((range) => ({ ...range, weight: 1e307 })),
    };
    assertPlanContract(input);
    const plan = buildConsumptionPlan(input);
    for (const range of input.rangeAllocations) {
      expect(
        plan.rows
          .filter((row) => row.locationName === range.rangeName)
          .reduce((sum, row) => sum + row.consumptionQuantity, 0),
      ).toBe(2500);
    }
  });

  it("保管上限と端数に合わせて購入量を250発に縮める", () => {
    const input = { ...baseInput, currentHomeStock: 255, homeStorageLimit: 500 };
    assertPlanContract(input);
    const plan = buildConsumptionPlan(input);
    expect(
      plan.rows.filter((row) => row.isAcquisition).map((row) => row.acquisitionQuantity),
    ).toEqual(Array(20).fill(250));
  });
});

function assertPlanContract(input: Parameters<typeof buildConsumptionPlan>[0]) {
  const plan = buildConsumptionPlan(input);
  const context = JSON.stringify({
    stock: input.currentHomeStock,
    quantity: input.requestedQuantity,
    from: input.periodFrom,
    to: input.periodTo,
  });
  const limit = input.homeStorageLimit ?? 800;
  let stock = input.currentHomeStock;
  let peak = stock;
  let acquisitions = 0;
  let consumptions = 0;
  let consumptionsSincePurchase = 0;
  let hasPurchase = false;
  let previousPeriod = 0;
  const periodOrder = { 上旬: 0, 中旬: 1, 下旬: 2 };
  for (const [index, row] of plan.rows.entries()) {
    expect(row.rowIndex, context).toBe(index + 1);
    expect(
      isPlanPeriodWithinRange({
        period: row.scheduledPeriod,
        from: input.periodFrom,
        to: input.periodTo,
      }),
      context,
    ).toBe(true);
    const period =
      (row.scheduledPeriod.year * 12 + row.scheduledPeriod.month) * 3 +
      periodOrder[row.scheduledPeriod.period];
    expect(period, context).toBeGreaterThanOrEqual(previousPeriod);
    previousPeriod = period;
    stock += row.acquisitionQuantity - row.consumptionQuantity;
    peak = Math.max(peak, stock);
    expect(stock, `${context} 行${row.rowIndex}`).toBeGreaterThanOrEqual(0);
    expect(stock, `${context} 行${row.rowIndex}`).toBeLessThanOrEqual(limit);
    if (row.isAcquisition) {
      expect(row.acquisitionQuantity, context).toBeGreaterThan(0);
      expect(row.acquisitionQuantity % 250, context).toBe(0);
      expect(row.acquisitionQuantity, context).toBeLessThanOrEqual(500);
      expect(row.consumptionQuantity, context).toBe(0);
      if (hasPurchase) {
        expect(consumptionsSincePurchase, context).toBeGreaterThanOrEqual(1);
        expect(consumptionsSincePurchase, context).toBeLessThanOrEqual(2);
      }
      hasPurchase = true;
      consumptionsSincePurchase = 0;
    } else {
      expect(row.consumptionQuantity, context).toBeGreaterThan(0);
      expect(row.consumptionQuantity % 25, context).toBe(0);
      expect(row.consumptionQuantity, context).toBeLessThanOrEqual(500);
      expect(row.acquisitionQuantity, context).toBe(0);
      consumptionsSincePurchase += 1;
    }
    acquisitions += row.acquisitionQuantity;
    consumptions += row.consumptionQuantity;
  }
  expect(acquisitions, context).toBe(input.requestedQuantity);
  expect(consumptions, context).toBe(input.requestedQuantity);
  expect(plan.totalAcquisition, context).toBe(acquisitions);
  expect(plan.totalConsumption, context).toBe(consumptions);
  expect(stock, context).toBe(input.currentHomeStock);
  expect(plan.peakHomeStock, context).toBe(peak);
  expect(
    plan.warnings.filter((warning) => !warning.startsWith("別紙1枚あたり")),
    context,
  ).toEqual([]);
}
