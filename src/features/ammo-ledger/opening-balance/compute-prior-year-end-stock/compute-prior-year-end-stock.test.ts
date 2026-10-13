import { describe, expect, it } from "vitest";
import type { StockTimelineEntry } from "@/features/ammo-ledger/ledger/compute-stock/compute-stock";
import { computePriorYearEndStock } from "./compute-prior-year-end-stock";

function entry(overrides: Partial<StockTimelineEntry>): StockTimelineEntry {
  return {
    ammoTypeId: "ammo-1",
    purpose: "shooting",
    category: "acquire",
    quantity: 0,
    occurredOn: "2026-06-01",
    ...overrides,
  };
}

describe("computePriorYearEndStock", () => {
  it("前年12月31日までを数え、対象年1月1日の繰越や記録は含めない", () => {
    const result = computePriorYearEndStock({
      year: 2027,
      entries: [
        entry({ category: "carryover", occurredOn: "2026-01-01", quantity: 100 }),
        entry({ category: "consume", occurredOn: "2026-12-31", quantity: 10 }),
        entry({ category: "carryover", occurredOn: "2027-01-01", quantity: 5 }),
        entry({ category: "consume", occurredOn: "2027-01-01", quantity: 3 }),
      ],
    });

    expect(result).toEqual({ shooting: { "ammo-1": 90 } });
  });

  it("用途ごとに分け、同じ弾種でも他の用途の記録を混ぜない", () => {
    const result = computePriorYearEndStock({
      year: 2027,
      entries: [
        entry({ category: "acquire", occurredOn: "2026-02-01", quantity: 100 }),
        entry({ purpose: "hunting", category: "acquire", occurredOn: "2026-02-01", quantity: 50 }),
        entry({ purpose: "hunting", category: "consume", occurredOn: "2026-11-01", quantity: 20 }),
        entry({
          ammoTypeId: "ammo-2",
          category: "acquire",
          occurredOn: "2026-03-01",
          quantity: 25,
        }),
      ],
    });

    expect(result).toEqual({
      shooting: { "ammo-1": 100, "ammo-2": 25 },
      hunting: { "ammo-1": 30 },
    });
  });

  it("途中の年の繰越は在庫計算と同じく残数を置き換える", () => {
    const entries = [
      entry({ category: "carryover", occurredOn: "2025-01-01", quantity: 100 }),
      entry({ category: "consume", occurredOn: "2025-06-01", quantity: 10 }),
      entry({ category: "carryover", occurredOn: "2026-01-01", quantity: 500 }),
      entry({ category: "consume", occurredOn: "2026-03-01", quantity: 50 }),
    ];

    expect(computePriorYearEndStock({ year: 2026, entries })).toEqual({
      shooting: { "ammo-1": 90 },
    });
    expect(computePriorYearEndStock({ year: 2027, entries })).toEqual({
      shooting: { "ammo-1": 450 },
    });
  });

  it("使い切った弾種は0として返し、記録のない用途や削除済み弾種は含めない", () => {
    const result = computePriorYearEndStock({
      year: 2027,
      entries: [
        entry({ category: "acquire", occurredOn: "2026-02-01", quantity: 25 }),
        entry({ category: "consume", occurredOn: "2026-02-02", quantity: 25 }),
        entry({ ammoTypeId: null, category: "acquire", occurredOn: "2026-02-01", quantity: 40 }),
      ],
    });

    expect(result).toEqual({ shooting: { "ammo-1": 0 } });
  });

  it("前年の記録がなければ空を返す", () => {
    expect(
      computePriorYearEndStock({
        year: 2026,
        entries: [entry({ category: "carryover", occurredOn: "2026-01-01", quantity: 100 })],
      }),
    ).toEqual({});
  });
});
