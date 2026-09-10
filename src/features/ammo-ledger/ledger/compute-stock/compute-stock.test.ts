import { describe, expect, it } from "vitest";
import { computeStockByAmmoType } from "./compute-stock";

describe("computeStockByAmmoType", () => {
  it("同じ弾種の用途別繰越を合算し、消費した用途だけを減らす", () => {
    const result = computeStockByAmmoType({
      entries: [
        {
          ammoTypeId: "ammo-1",
          purpose: "shooting",
          occurredOn: "2025-01-01",
          category: "carryover",
          quantity: 100,
        },
        {
          ammoTypeId: "ammo-1",
          purpose: "hunting",
          occurredOn: "2025-01-01",
          category: "carryover",
          quantity: 50,
        },
        {
          ammoTypeId: "ammo-1",
          purpose: "shooting",
          occurredOn: "2025-06-01",
          category: "consume",
          quantity: 10,
        },
      ],
    });
    expect(result.get("ammo-1")).toBe(140);
  });

  it("取得順に依存せず、翌年の繰越は該当用途だけを置き換える", () => {
    const result = computeStockByAmmoType({
      entries: [
        {
          ammoTypeId: "ammo-1",
          purpose: "shooting",
          occurredOn: "2026-02-01",
          category: "consume",
          quantity: 50,
        },
        {
          ammoTypeId: "ammo-1",
          purpose: "shooting",
          occurredOn: "2026-01-01",
          category: "carryover",
          quantity: 400,
        },
        {
          ammoTypeId: "ammo-1",
          purpose: "hunting",
          occurredOn: "2025-01-01",
          category: "carryover",
          quantity: 20,
        },
        {
          ammoTypeId: "ammo-1",
          purpose: "shooting",
          occurredOn: "2025-06-01",
          category: "consume",
          quantity: 100,
        },
        {
          ammoTypeId: "ammo-1",
          purpose: "shooting",
          occurredOn: "2025-01-01",
          category: "carryover",
          quantity: 500,
        },
      ],
    });
    expect(result.get("ammo-1")).toBe(370);
  });

  it("同日内は並び順・作成日時・IDの順で残数を計算する", () => {
    const result = computeStockByAmmoType({
      entries: [
        {
          id: "e3",
          ammoTypeId: "ammo-1",
          purpose: "shooting",
          occurredOn: "2026-01-01",
          dayOrder: 1,
          category: "consume",
          quantity: 10,
        },
        {
          id: "e2",
          ammoTypeId: "ammo-1",
          purpose: "shooting",
          occurredOn: "2026-01-01",
          dayOrder: 0,
          category: "acquire",
          quantity: 25,
        },
        {
          id: "e1",
          ammoTypeId: "ammo-1",
          purpose: "shooting",
          occurredOn: "2026-01-01",
          dayOrder: 0,
          category: "carryover",
          quantity: 100,
        },
      ],
    });
    expect(result.get("ammo-1")).toBe(115);
  });

  it("譲受と消費から残数を計算する", () => {
    const result = computeStockByAmmoType({
      entries: [
        {
          ammoTypeId: "ammo-1",
          purpose: "shooting",
          occurredOn: "2026-01-01",
          category: "acquire",
          quantity: 250,
        },
        {
          ammoTypeId: "ammo-1",
          purpose: "shooting",
          occurredOn: "2026-01-01",
          category: "consume",
          quantity: 73,
        },
        {
          ammoTypeId: "ammo-2",
          purpose: "shooting",
          occurredOn: "2026-01-01",
          category: "acquire",
          quantity: 100,
        },
      ],
    });

    expect(result.get("ammo-1")).toBe(177);
    expect(result.get("ammo-2")).toBe(100);
  });

  it("譲渡と廃棄も減算する", () => {
    const result = computeStockByAmmoType({
      entries: [
        {
          ammoTypeId: "ammo-1",
          purpose: "shooting",
          occurredOn: "2026-01-01",
          category: "acquire",
          quantity: 300,
        },
        {
          ammoTypeId: "ammo-1",
          purpose: "shooting",
          occurredOn: "2026-01-01",
          category: "transfer",
          quantity: 50,
        },
        {
          ammoTypeId: "ammo-1",
          purpose: "shooting",
          occurredOn: "2026-01-01",
          category: "dispose",
          quantity: 25,
        },
      ],
    });

    expect(result.get("ammo-1")).toBe(225);
  });

  it("製造・被交付は加算、交付は減算する", () => {
    const result = computeStockByAmmoType({
      entries: [
        {
          ammoTypeId: "ammo-1",
          purpose: "shooting",
          occurredOn: "2026-01-01",
          category: "manufacture",
          quantity: 100,
        },
        {
          ammoTypeId: "ammo-1",
          purpose: "shooting",
          occurredOn: "2026-01-01",
          category: "receive",
          quantity: 50,
        },
        {
          ammoTypeId: "ammo-1",
          purpose: "shooting",
          occurredOn: "2026-01-01",
          category: "issue",
          quantity: 30,
        },
      ],
    });

    expect(result.get("ammo-1")).toBe(120);
  });

  it("繰越は入力順で残数を設定する", () => {
    const result = computeStockByAmmoType({
      entries: [
        {
          ammoTypeId: "ammo-1",
          purpose: "shooting",
          occurredOn: "2026-01-01",
          category: "acquire",
          quantity: 100,
        },
        {
          ammoTypeId: "ammo-1",
          purpose: "shooting",
          occurredOn: "2026-01-01",
          category: "carryover",
          quantity: 80,
        },
        {
          ammoTypeId: "ammo-1",
          purpose: "shooting",
          occurredOn: "2026-01-01",
          category: "consume",
          quantity: 30,
        },
      ],
    });

    expect(result.get("ammo-1")).toBe(50);
  });

  it("同一弾種の繰越は後勝ちで残数を上書きする", () => {
    const result = computeStockByAmmoType({
      entries: [
        {
          ammoTypeId: "ammo-1",
          purpose: "shooting",
          occurredOn: "2026-01-01",
          category: "carryover",
          quantity: 80,
        },
        {
          ammoTypeId: "ammo-1",
          purpose: "shooting",
          occurredOn: "2026-01-01",
          category: "carryover",
          quantity: 120,
        },
      ],
    });

    expect(result.get("ammo-1")).toBe(120);
  });
});
