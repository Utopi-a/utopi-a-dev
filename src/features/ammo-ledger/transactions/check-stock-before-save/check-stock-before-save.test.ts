import { describe, expect, it } from "vitest";
import { validateStockChanges } from "@/features/ammo-ledger/transactions/check-stock-before-save/check-stock-before-save";

describe("validateStockChanges", () => {
  it("在庫と同数の出庫を許可する", () => {
    const result = validateStockChanges({
      stockByAmmoType: new Map([["ammo-1", 50]]),
      changes: [
        {
          ammoTypeId: "ammo-1",
          ammoTypeName: "12番・散弾",
          category: "consume",
          quantity: 50,
        },
      ],
    });

    expect(result).toEqual({ ok: true });
  });

  it("在庫を超える出庫をエラーにする", () => {
    const result = validateStockChanges({
      stockByAmmoType: new Map([["ammo-1", 40]]),
      changes: [
        {
          ammoTypeId: "ammo-1",
          ammoTypeName: "12番・散弾",
          category: "consume",
          quantity: 50,
        },
      ],
    });

    expect(result).toEqual({
      ok: false,
      error: "12番・散弾の在庫が不足しています（残り40発、出庫50発）",
    });
  });

  it("一括出庫の合計が在庫を超える場合はエラーにする", () => {
    const result = validateStockChanges({
      stockByAmmoType: new Map([["ammo-1", 80]]),
      changes: [
        {
          ammoTypeId: "ammo-1",
          ammoTypeName: "12番・散弾",
          category: "consume",
          quantity: 50,
        },
        {
          ammoTypeId: "ammo-1",
          ammoTypeName: "12番・散弾",
          category: "consume",
          quantity: 40,
        },
      ],
    });

    expect(result).toEqual({
      ok: false,
      error: "12番・散弾の在庫が不足しています（残り30発、出庫40発）",
    });
  });

  it("同じ一括登録内の入庫を後続の出庫に反映する", () => {
    const result = validateStockChanges({
      stockByAmmoType: new Map([["ammo-1", 0]]),
      changes: [
        {
          ammoTypeId: "ammo-1",
          ammoTypeName: "12番・散弾",
          category: "acquire",
          quantity: 50,
        },
        {
          ammoTypeId: "ammo-1",
          ammoTypeName: "12番・散弾",
          category: "consume",
          quantity: 50,
        },
      ],
    });

    expect(result).toEqual({ ok: true });
  });
});
