import { describe, expect, it } from "vitest";
import {
  distributeEvenlyAcrossSlots,
  partitionQuantity,
  splitIntoUnitMultiples,
} from "./partition-quantity";

describe("distributeEvenlyAcrossSlots", () => {
  it("450を4枠に125上限で均等配分する", () => {
    const quantities = distributeEvenlyAcrossSlots({
      slotCount: 4,
      totalQuantity: 450,
      maxPerSlot: 125,
      unit: 25,
    });

    expect(quantities).toEqual([125, 125, 100, 100]);
  });
});

describe("splitIntoUnitMultiples", () => {
  it("5000を7分割に250倍数で分ける", () => {
    const parts = splitIntoUnitMultiples({
      totalQuantity: 5000,
      unit: 250,
      pieceCount: 7,
    });

    expect(parts.reduce((sum, value) => sum + value, 0)).toBe(5000);
    expect(parts.every((value) => value % 250 === 0)).toBe(true);
    expect(parts.length).toBe(7);
  });
});

describe("partitionQuantity", () => {
  it("750発ごと目安に購入块数を決める", () => {
    const parts = partitionQuantity({
      totalQuantity: 5000,
      unit: 250,
      preferredBatchSize: 750,
    });

    expect(parts.reduce((sum, value) => sum + value, 0)).toBe(5000);
    expect(parts.every((value) => value % 250 === 0)).toBe(true);
    expect(parts.length).toBeLessThan(20);
  });

  it("300発を250倍数の1块にする", () => {
    expect(
      partitionQuantity({
        totalQuantity: 500,
        unit: 250,
        preferredBatchSize: 750,
      }),
    ).toEqual([500]);
  });
});
