import { describe, expect, it } from "vitest";
import { evaluateHomeStorageLimit } from "./compute-running-home-stock";

describe("evaluateHomeStorageLimit", () => {
  it("翌年の繰越を二重計上せず、他用途の残数を維持する", () => {
    const result = evaluateHomeStorageLimit({
      entries: [
        {
          id: "e5",
          ammoTypeId: "a",
          purpose: "shooting",
          occurredOn: "2026-02-01",
          category: "consume",
          quantity: 50,
        },
        {
          id: "e4",
          ammoTypeId: "a",
          purpose: "shooting",
          occurredOn: "2026-01-01",
          category: "carryover",
          quantity: 400,
        },
        {
          id: "e3",
          ammoTypeId: "a",
          purpose: "shooting",
          occurredOn: "2025-06-01",
          category: "consume",
          quantity: 100,
        },
        {
          id: "e2",
          ammoTypeId: "a",
          purpose: "hunting",
          occurredOn: "2025-01-02",
          category: "carryover",
          quantity: 20,
        },
        {
          id: "e1",
          ammoTypeId: "a",
          purpose: "shooting",
          occurredOn: "2025-01-01",
          category: "carryover",
          quantity: 500,
        },
      ],
    });
    expect(result.currentStock).toBe(370);
    expect(result.peakStock).toBe(520);
    expect(result.exceededEntryIds).toEqual([]);
  });

  it("削除済み弾種は用途・名称・番径のsnapshotごとに繰越を置き換える", () => {
    const result = evaluateHomeStorageLimit({
      entries: [
        {
          id: "a1",
          ammoTypeId: null,
          ammoTypeName: "旧実包",
          ammoCaliber: "12",
          purpose: "shooting",
          occurredOn: "2025-01-01",
          category: "carryover",
          quantity: 100,
        },
        {
          id: "b1",
          ammoTypeId: null,
          ammoTypeName: "旧実包",
          ammoCaliber: "20",
          purpose: "shooting",
          occurredOn: "2025-01-01",
          category: "carryover",
          quantity: 50,
        },
        {
          id: "a2",
          ammoTypeId: null,
          ammoTypeName: "旧実包",
          ammoCaliber: "12",
          purpose: "shooting",
          occurredOn: "2026-01-01",
          category: "carryover",
          quantity: 80,
        },
        {
          id: "b2",
          ammoTypeId: null,
          ammoTypeName: "旧実包",
          ammoCaliber: "20",
          purpose: "shooting",
          occurredOn: "2026-02-01",
          category: "consume",
          quantity: 10,
        },
      ],
    });
    expect(result.currentStock).toBe(120);
    expect(result.peakStock).toBe(150);
  });

  it("譲受と消費から自宅保管の推移を評価する", () => {
    const result = evaluateHomeStorageLimit({
      entries: [
        {
          id: "e1",
          ammoTypeId: "a",
          purpose: "shooting",
          occurredOn: "2026-01-01",
          category: "acquire",
          quantity: 500,
        },
        {
          id: "e2",
          ammoTypeId: "a",
          purpose: "shooting",
          occurredOn: "2026-02-01",
          category: "acquire",
          quantity: 400,
        },
        {
          id: "e3",
          ammoTypeId: "a",
          purpose: "shooting",
          occurredOn: "2026-03-01",
          category: "consume",
          quantity: 200,
        },
      ],
    });

    expect(result.peakStock).toBe(900);
    expect(result.hasExceededBefore).toBe(true);
    expect(result.currentStock).toBe(700);
    expect(result.isCurrentlyExceeded).toBe(false);
    expect(result.exceededEntryIds).toEqual(["e2"]);
  });

  it("800発以下なら警告対象にならない", () => {
    const result = evaluateHomeStorageLimit({
      entries: [
        {
          id: "e1",
          ammoTypeId: "a",
          purpose: "shooting",
          occurredOn: "2026-01-01",
          category: "acquire",
          quantity: 800,
        },
        {
          id: "e2",
          ammoTypeId: "a",
          purpose: "shooting",
          occurredOn: "2026-02-01",
          category: "consume",
          quantity: 300,
        },
      ],
    });

    expect(result.hasExceededBefore).toBe(false);
    expect(result.currentStock).toBe(500);
  });
});
