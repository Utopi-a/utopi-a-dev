import { describe, expect, it } from "vitest";
import { buildConsumeEditStock } from "@/features/ammo-ledger/transactions/build-consume-edit-stock/build-consume-edit-stock";

describe("buildConsumeEditStock", () => {
  it("元弾種の帳簿残数に元消費量を戻す", () => {
    const result = buildConsumeEditStock({
      bookStockByAmmoTypeId: { "ammo-1": 0 },
      originalAmmoTypeId: "ammo-1",
      originalQuantity: 50,
    });

    expect(result["ammo-1"]).toBe(50);
  });

  it("他弾種の帳簿残数を変えない", () => {
    const result = buildConsumeEditStock({
      bookStockByAmmoTypeId: { "ammo-1": 0, "ammo-2": 30 },
      originalAmmoTypeId: "ammo-1",
      originalQuantity: 50,
    });

    expect(result).toEqual({ "ammo-1": 50, "ammo-2": 30 });
  });

  it("入力の帳簿残数を破壊しない", () => {
    const bookStockByAmmoTypeId = { "ammo-1": 0, "ammo-2": 30 };

    buildConsumeEditStock({
      bookStockByAmmoTypeId,
      originalAmmoTypeId: "ammo-1",
      originalQuantity: 50,
    });

    expect(bookStockByAmmoTypeId).toEqual({ "ammo-1": 0, "ammo-2": 30 });
  });
});
