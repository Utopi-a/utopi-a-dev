import { describe, expect, it } from "vitest";
import { computeSwappedDayOrders } from "./compute-swapped-day-orders";

describe("computeSwappedDayOrders", () => {
  it("同日の記録を1つ上へ移動する", () => {
    const entries = [
      { id: "a", occurredOn: "2026-06-07", dayOrder: 0, createdAt: "2026-06-07T09:00:00.000Z" },
      { id: "b", occurredOn: "2026-06-07", dayOrder: 1, createdAt: "2026-06-07T10:00:00.000Z" },
    ];

    expect(computeSwappedDayOrders({ entries, ledgerEntryId: "b", direction: "up" })).toEqual(
      new Map([
        ["b", 0],
        ["a", 1],
      ]),
    );
  });

  it("dayOrder が同じ場合は退避してから入れ替える", () => {
    const entries = [
      { id: "a", occurredOn: "2026-06-07", dayOrder: 0, createdAt: "2026-06-07T09:00:00.000Z" },
      { id: "b", occurredOn: "2026-06-07", dayOrder: 0, createdAt: "2026-06-07T10:00:00.000Z" },
    ];

    expect(computeSwappedDayOrders({ entries, ledgerEntryId: "b", direction: "up" })).toEqual(
      new Map([
        ["b", 0],
        ["a", 1],
      ]),
    );
  });
});
