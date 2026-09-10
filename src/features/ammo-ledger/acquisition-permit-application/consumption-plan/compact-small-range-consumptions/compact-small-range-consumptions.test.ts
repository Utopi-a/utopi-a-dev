import { describe, expect, it } from "vitest";
import type { AcquisitionEvent, ConsumptionEvent } from "../consumption-plan-types";
import { compactSmallRangeConsumptions } from "./compact-small-range-consumptions";

const period = { year: 2026, month: 4, period: "上旬" as const };
const acquisitions: AcquisitionEvent[] = [
  { scheduledPeriod: period, quantity: 500, slotSequence: 0 },
];

function consumption({
  quantity,
  rangeId = "a",
  slotSequence,
  eventSequence = 0,
}: {
  quantity: number;
  rangeId?: string;
  slotSequence: number;
  eventSequence?: number;
}): ConsumptionEvent {
  return {
    scheduledPeriod: period,
    slotSequence,
    eventSequence,
    quantity,
    rangeId,
    rangeName: `${rangeId.toUpperCase()}射撃場`,
    rangeAddress: "茨城県",
    purpose: "標的射撃",
  };
}

function compact({
  input,
  initialStock = 300,
  purchaseEvents = acquisitions,
}: {
  input: ConsumptionEvent[];
  initialStock?: number;
  purchaseEvents?: AcquisitionEvent[];
}) {
  return compactSmallRangeConsumptions({
    acquisitions: purchaseEvents,
    consumptions: input,
    initialStock,
    minimumConsumption: 100,
    maxConsumptionPerEvent: 500,
  });
}

describe("compactSmallRangeConsumptions", () => {
  it("最後の購入後の小口を同じ射撃場の過去行へ前倒しする", () => {
    const result = compact({
      input: [
        consumption({ quantity: 200, slotSequence: -1 }),
        consumption({ quantity: 25, slotSequence: 0 }),
      ],
    });

    expect(result.map(({ quantity }) => quantity)).toEqual([225]);
    expect(result[0].slotSequence).toBe(-1);
  });

  it("前倒しで在庫が負になる場合はまとめない", () => {
    const input = [
      consumption({ quantity: 100, slotSequence: -1 }),
      consumption({ quantity: 25, slotSequence: 0 }),
    ];

    expect(compact({ input, initialStock: 100 }).map(({ quantity }) => quantity)).toEqual([
      100, 25,
    ]);
  });

  it("小口が先にある場合も、後の同じ射撃場の消費を前倒ししてまとめる", () => {
    const result = compact({
      input: [
        consumption({ quantity: 25, slotSequence: -1 }),
        consumption({ quantity: 100, slotSequence: 0 }),
      ],
    });
    expect(result.map(({ quantity }) => quantity)).toEqual([125]);
    expect(result[0].slotSequence).toBe(-1);
  });

  it("合流後に500発を超える場合はまとめない", () => {
    const input = [
      consumption({ quantity: 500, slotSequence: -1 }),
      consumption({ quantity: 25, slotSequence: 0 }),
    ];

    expect(compact({ input, initialStock: 600 }).map(({ quantity }) => quantity)).toEqual([
      500, 25,
    ]);
  });

  it("異なる射撃場の行にはまとめない", () => {
    const input = [
      consumption({ quantity: 200, slotSequence: -1, rangeId: "a" }),
      consumption({ quantity: 25, slotSequence: 0, rangeId: "b" }),
    ];

    expect(compact({ input }).map(({ quantity }) => quantity)).toEqual([200, 25]);
  });

  it("購入間で唯一の消費行は残す", () => {
    const purchaseEvents: AcquisitionEvent[] = [
      { scheduledPeriod: period, quantity: 500, slotSequence: 0 },
      { scheduledPeriod: period, quantity: 500, slotSequence: 2 },
    ];
    const input = [
      consumption({ quantity: 200, slotSequence: -1 }),
      consumption({ quantity: 25, slotSequence: 1 }),
    ];

    expect(compact({ input, purchaseEvents }).map(({ quantity }) => quantity)).toEqual([200, 25]);
  });

  it("入力イベントを変更しない", () => {
    const input = [
      consumption({ quantity: 200, slotSequence: -1 }),
      consumption({ quantity: 25, slotSequence: 0 }),
    ];
    const before = structuredClone(input);

    compact({ input });

    expect(input).toEqual(before);
  });
});
