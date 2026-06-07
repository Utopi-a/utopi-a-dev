import { describe, expect, it } from "vitest";
import {
  compareTimelinePosition,
  isConsumptionBetweenAcquisitions,
} from "./consumption-plan-timeline";

describe("compareTimelinePosition", () => {
  it("同一スロット内では購入の直後に消費を並べる", () => {
    const period = { year: 2026, month: 4, period: "上旬" as const };

    expect(
      compareTimelinePosition({
        a: { scheduledPeriod: period, slotSequence: 0, kind: "acquisition" },
        b: { scheduledPeriod: period, slotSequence: 0, kind: "consumption" },
      }),
    ).toBeLessThan(0);
  });
});

describe("isConsumptionBetweenAcquisitions", () => {
  it("直後の消費を購入間の消費として数える", () => {
    const period = { year: 2026, month: 4, period: "上旬" as const };
    const current = { scheduledPeriod: period, quantity: 500, slotSequence: 0 };
    const next = { scheduledPeriod: period, quantity: 500, slotSequence: 1 };
    const consumption = {
      scheduledPeriod: period,
      quantity: 500,
      slotSequence: 0,
      rangeId: "r1",
      rangeName: "A",
      rangeAddress: "addr",
      purpose: "標的射撃" as const,
    };

    expect(isConsumptionBetweenAcquisitions({ consumption, current, next })).toBe(true);
  });
});
