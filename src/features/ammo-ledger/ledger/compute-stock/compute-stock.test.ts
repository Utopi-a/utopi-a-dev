import { describe, expect, it } from "vitest";
import { computeStockByAmmoType } from "./compute-stock";

describe("computeStockByAmmoType", () => {
  it("譲受と消費から残数を計算する", () => {
    const result = computeStockByAmmoType({
      entries: [
        { ammoTypeId: "ammo-1", category: "acquire", quantity: 250 },
        { ammoTypeId: "ammo-1", category: "consume", quantity: 73 },
        { ammoTypeId: "ammo-2", category: "acquire", quantity: 100 },
      ],
    });

    expect(result.get("ammo-1")).toBe(177);
    expect(result.get("ammo-2")).toBe(100);
  });

  it("譲渡と廃棄も減算する", () => {
    const result = computeStockByAmmoType({
      entries: [
        { ammoTypeId: "ammo-1", category: "acquire", quantity: 300 },
        { ammoTypeId: "ammo-1", category: "transfer", quantity: 50 },
        { ammoTypeId: "ammo-1", category: "dispose", quantity: 25 },
      ],
    });

    expect(result.get("ammo-1")).toBe(225);
  });

  it("繰越も加算する", () => {
    const result = computeStockByAmmoType({
      entries: [
        { ammoTypeId: "ammo-1", category: "carryover", quantity: 80 },
        { ammoTypeId: "ammo-1", category: "consume", quantity: 30 },
      ],
    });

    expect(result.get("ammo-1")).toBe(50);
  });
});
