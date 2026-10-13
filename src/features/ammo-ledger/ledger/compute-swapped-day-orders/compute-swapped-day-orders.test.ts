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

  it("同じ並び順の値が3件以上あっても、隣の1件とだけ入れ替える", () => {
    const entries = [
      { id: "a", occurredOn: "2026-01-01", dayOrder: -1, createdAt: "2026-06-07T09:00:00.000Z" },
      { id: "b", occurredOn: "2026-01-01", dayOrder: -1, createdAt: "2026-06-07T10:00:00.000Z" },
      { id: "c", occurredOn: "2026-01-01", dayOrder: -1, createdAt: "2026-06-07T11:00:00.000Z" },
    ];

    const nextDayOrders = computeSwappedDayOrders({ entries, ledgerEntryId: "b", direction: "up" });
    const reordered = entries
      .map((entry) => ({ ...entry, dayOrder: nextDayOrders?.get(entry.id) ?? entry.dayOrder }))
      .sort((x, y) => x.dayOrder - y.dayOrder)
      .map((entry) => entry.id);

    expect(reordered).toEqual(["b", "a", "c"]);
  });

  it("作成日時まで同じ記録も id 順で安定して並べ替える", () => {
    const createdAt = "2026-06-07T09:00:00.000Z";
    const entries = [
      { id: "b", occurredOn: "2026-06-07", dayOrder: 0, createdAt },
      { id: "a", occurredOn: "2026-06-07", dayOrder: 0, createdAt },
    ];

    expect(computeSwappedDayOrders({ entries, ledgerEntryId: "b", direction: "up" })).toEqual(
      new Map([
        ["b", 0],
        ["a", 1],
      ]),
    );
  });

  it("通常の記録を繰越より上へは動かさない", () => {
    const entries = [
      {
        id: "carryover",
        category: "carryover",
        occurredOn: "2026-01-01",
        dayOrder: -1,
        createdAt: "2026-01-01T00:00:00.000Z",
      },
      {
        id: "consume",
        category: "consume",
        occurredOn: "2026-01-01",
        dayOrder: 0,
        createdAt: "2026-01-01T01:00:00.000Z",
      },
    ];

    expect(
      computeSwappedDayOrders({ entries, ledgerEntryId: "consume", direction: "up" }),
    ).toBeNull();
    expect(
      computeSwappedDayOrders({ entries, ledgerEntryId: "carryover", direction: "down" }),
    ).toBeNull();
  });

  it("繰越より上にある通常の記録は、繰越の下へ戻せる", () => {
    const entries = [
      {
        id: "consume",
        category: "consume",
        occurredOn: "2026-01-01",
        dayOrder: 0,
        createdAt: "2026-01-01T01:00:00.000Z",
      },
      {
        id: "carryover",
        category: "carryover",
        occurredOn: "2026-01-01",
        dayOrder: 1,
        createdAt: "2026-01-01T00:00:00.000Z",
      },
    ];

    expect(
      computeSwappedDayOrders({ entries, ledgerEntryId: "consume", direction: "down" }),
    ).toEqual(
      new Map([
        ["carryover", 0],
        ["consume", 1],
      ]),
    );
  });
});
