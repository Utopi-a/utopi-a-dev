import { describe, expect, it } from "vitest";
import type { RangeAllocation } from "../consumption-plan-types";
import { allocateNaturalRangeConsumptions } from "./allocate-natural-range-consumptions";

const ranges: RangeAllocation[] = [
  {
    rangeId: "a",
    rangeName: "A射撃場",
    rangeAddress: "茨城県A",
    purpose: "標的射撃",
    weight: 1,
  },
  {
    rangeId: "b",
    rangeName: "B射撃場",
    rangeAddress: "茨城県B",
    purpose: "狩猟（鳥獣の捕獲）",
    weight: 1,
  },
  {
    rangeId: "c",
    rangeName: "C射撃場",
    rangeAddress: "茨城県C",
    purpose: "有害鳥獣の駆除",
    weight: 1,
  },
];

function allocate(remaining: number[], quantity = 500) {
  return allocateNaturalRangeConsumptions({
    quantity,
    remainingByRange: new Map(remaining.map((value, index) => [ranges[index].rangeId, value])),
    rangeAllocations: ranges.slice(0, remaining.length),
    consumptionUnit: 25,
    minimumConsumption: 100,
  });
}

describe("allocateNaturalRangeConsumptions", () => {
  it.each([
    { remaining: [525, 225], expected: [275, 225], after: [250, 0] },
    { remaining: [575, 175], expected: [325, 175], after: [250, 0] },
  ])("小さい行と小さい射撃場残量を同時に避ける: $remaining", ({ remaining, expected, after }) => {
    const result = allocate(remaining);

    expect(result.map(({ quantity }) => quantity)).toEqual(expected);
    expect(result.map(({ range }) => range.rangeId)).toEqual(["a", "b"]);
    expect(
      result.map(({ range, quantity }) => remaining[ranges.indexOf(range)] - quantity),
    ).toEqual(after);
  });

  it("1射撃場で自然に収まる場合は分割しない", () => {
    expect(allocate([675, 325])).toEqual([{ range: ranges[0], quantity: 500 }]);
  });

  it("25発しかない場合は避けられない小さい行を許容する", () => {
    expect(allocate([25], 25)).toEqual([{ range: ranges[0], quantity: 25 }]);
  });

  it("2射撃場で収まらない場合は3射撃場へ正確に配分する", () => {
    const result = allocate([175, 175, 150]);

    expect(result.map(({ quantity }) => quantity)).toEqual([175, 175, 150]);
    expect(result.reduce((sum, allocation) => sum + allocation.quantity, 0)).toBe(500);
  });

  it("入力の射撃場別残量を変更しない", () => {
    const remainingByRange = new Map([
      ["a", 575],
      ["b", 175],
    ]);

    allocateNaturalRangeConsumptions({
      quantity: 500,
      remainingByRange,
      rangeAllocations: ranges.slice(0, 2),
      consumptionUnit: 25,
      minimumConsumption: 100,
    });

    expect([...remainingByRange.entries()]).toEqual([
      ["a", 575],
      ["b", 175],
    ]);
  });
});
