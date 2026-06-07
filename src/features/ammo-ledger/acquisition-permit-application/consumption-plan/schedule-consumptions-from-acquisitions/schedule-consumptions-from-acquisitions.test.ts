import { describe, expect, it } from "vitest";
import { listPlanPeriodsInRange } from "../plan-period/plan-period";
import {
  countConsumptionsBetweenPurchases,
  scheduleConsumptionsFromAcquisitions,
} from "./schedule-consumptions-from-acquisitions";

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

describe("scheduleConsumptionsFromAcquisitions", () => {
  const acquisitions = [
    { scheduledPeriod: { year: 2026, month: 4, period: "上旬" as const }, quantity: 500 },
    { scheduledPeriod: { year: 2026, month: 10, period: "上旬" as const }, quantity: 500 },
  ];

  it("各購入の直後に消費を置く", () => {
    const periodFrom = "2026-04-01";
    const periodTo = "2027-03-31";

    const scheduled = scheduleConsumptionsFromAcquisitions({
      acquisitions,
      requestedQuantity: 1000,
      shootingQuantity: 1000,
      bufferNeedByAcquisition: [0, 0],
      periodFrom,
      periodTo,
      rangeAllocations: [ranges[0]],
    });

    const consumptions = [...scheduled.bufferConsumptions, ...scheduled.shootingConsumptions];

    expect(consumptions.length).toBeGreaterThan(0);
    expect(consumptions.reduce((sum, event) => sum + event.quantity, 0)).toBe(1000);

    const perGap = countConsumptionsBetweenPurchases({ consumptions, acquisitions });
    expect(perGap.every((count) => count >= 1)).toBe(true);
    expect(perGap.every((count) => count <= 2)).toBe(true);
  });

  it("1500発を250発以上の块で配分する", () => {
    const periodFrom = "2026-04-01";
    const periodTo = "2027-03-31";

    const scheduled = scheduleConsumptionsFromAcquisitions({
      acquisitions,
      requestedQuantity: 1500,
      shootingQuantity: 1500,
      bufferNeedByAcquisition: [0, 0],
      periodFrom,
      periodTo,
      rangeAllocations: [ranges[0]],
    });

    const consumptions = [...scheduled.bufferConsumptions, ...scheduled.shootingConsumptions];

    expect(consumptions.reduce((sum, event) => sum + event.quantity, 0)).toBe(1500);
    expect(consumptions.every((event) => event.quantity >= 250)).toBe(true);
  });

  it("同一区間に複数購入がある場合も直後消費で交互配置する", () => {
    const periodFrom = "2026-04-01";
    const periodTo = "2026-04-30";
    const samePeriodAcquisitions = [
      {
        scheduledPeriod: { year: 2026, month: 4, period: "上旬" as const },
        quantity: 500,
        slotSequence: 0,
      },
      {
        scheduledPeriod: { year: 2026, month: 4, period: "上旬" as const },
        quantity: 500,
        slotSequence: 1,
      },
    ];

    const scheduled = scheduleConsumptionsFromAcquisitions({
      acquisitions: samePeriodAcquisitions,
      requestedQuantity: 1000,
      shootingQuantity: 1000,
      bufferNeedByAcquisition: [500, 0],
      periodFrom,
      periodTo,
      rangeAllocations: [ranges[0]],
    });

    const consumptions = [...scheduled.bufferConsumptions, ...scheduled.shootingConsumptions];
    const perGap = countConsumptionsBetweenPurchases({
      consumptions,
      acquisitions: samePeriodAcquisitions,
    });

    expect(perGap.every((count) => count >= 1)).toBe(true);
    expect(consumptions.every((event) => event.quantity <= 500)).toBe(true);
  });

  it("許可期間の枠数に応じて消費を配分する", () => {
    const periodFrom = "2026-04-01";
    const periodTo = "2027-03-31";
    const availablePeriods = listPlanPeriodsInRange({ from: periodFrom, to: periodTo });

    const scheduled = scheduleConsumptionsFromAcquisitions({
      acquisitions,
      requestedQuantity: 1500,
      shootingQuantity: 1500,
      bufferNeedByAcquisition: [0, 0],
      periodFrom,
      periodTo,
      rangeAllocations: [ranges[0]],
    });

    const consumptions = [...scheduled.bufferConsumptions, ...scheduled.shootingConsumptions];

    expect(availablePeriods.length).toBeGreaterThan(0);
    expect(consumptions.reduce((sum, event) => sum + event.quantity, 0)).toBe(1500);
  });
});
