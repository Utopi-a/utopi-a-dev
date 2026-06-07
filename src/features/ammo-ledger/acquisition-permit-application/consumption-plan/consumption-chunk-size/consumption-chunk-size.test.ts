import { describe, expect, it } from "vitest";
import {
  computePreferredConsumptionBatchSize,
  splitGapConsumptionQuantity,
} from "./consumption-chunk-size";

describe("computePreferredConsumptionBatchSize", () => {
  it("5000発を購入間の最大2回消費で割ると250前後になる", () => {
    expect(
      computePreferredConsumptionBatchSize({
        requestedQuantity: 5000,
        gapCount: 9,
        consumptionUnit: 25,
        maxPerEvent: 500,
      }),
    ).toBeGreaterThanOrEqual(250);
  });

  it("50000発でも小さすぎる块にならない", () => {
    const batch = computePreferredConsumptionBatchSize({
      requestedQuantity: 50000,
      gapCount: 99,
      consumptionUnit: 25,
      maxPerEvent: 500,
    });
    expect(batch).toBeGreaterThanOrEqual(250);
  });
});

describe("splitGapConsumptionQuantity", () => {
  it("500は1块に収める", () => {
    expect(
      splitGapConsumptionQuantity({
        gapTotal: 500,
        consumptionUnit: 25,
        preferredBatchSize: 275,
        maxPerEvent: 500,
      }),
    ).toEqual([500]);
  });

  it("600は2块に分ける", () => {
    expect(
      splitGapConsumptionQuantity({
        gapTotal: 600,
        consumptionUnit: 25,
        preferredBatchSize: 275,
        maxPerEvent: 500,
      }),
    ).toEqual([300, 300]);
  });

  it("250以下は1块", () => {
    expect(
      splitGapConsumptionQuantity({
        gapTotal: 250,
        consumptionUnit: 25,
        preferredBatchSize: 275,
        maxPerEvent: 500,
      }),
    ).toEqual([250]);
  });
});
