import { describe, expect, it } from "vitest";
import { type AmmoTypeStock, sumHomeStockForAmmoName } from "./application-ammo-name";

const ammoTypeStocks: AmmoTypeStock[] = [
  { cartridgeType: "shotgun_shot", caliber: "12番", bookStock: 300 },
  { cartridgeType: "shotgun_slug", caliber: "１２番 ", bookStock: 50 },
  { cartridgeType: "shotgun_shot", caliber: "20番", bookStock: 100 },
  { cartridgeType: "rifle", caliber: ".308WIN", bookStock: 40 },
  { cartridgeType: "rifle", caliber: "12番", bookStock: 7 },
];

describe("sumHomeStockForAmmoName", () => {
  it.each([
    ["12番", 350],
    ["20番", 100],
    ["410番", 0],
    ["実包（ライフル）", 47],
  ] as const)("%s は該当する弾種だけを %i 発と合計する", (ammoName, expected) => {
    expect(sumHomeStockForAmmoName({ ammoName, ammoTypeStocks })).toBe(expected);
  });

  it("帳簿の残数がマイナスでも 0 未満にはしない", () => {
    expect(
      sumHomeStockForAmmoName({
        ammoName: "12番",
        ammoTypeStocks: [{ cartridgeType: "shotgun_shot", caliber: "12番", bookStock: -25 }],
      }),
    ).toBe(0);
  });

  it("番径の「番」や「ga」の有無、全角数字の違いでも同じ名称として数える", () => {
    expect(
      sumHomeStockForAmmoName({
        ammoName: "12番",
        ammoTypeStocks: [
          { cartridgeType: "shotgun_shot", caliber: "12", bookStock: 100 },
          { cartridgeType: "shotgun_slug", caliber: "１２番", bookStock: 20 },
          { cartridgeType: "shotgun_shot", caliber: "12 GA", bookStock: 5 },
          { cartridgeType: "shotgun_shot", caliber: "20番", bookStock: 40 },
        ],
      }),
    ).toBe(125);
    expect(
      sumHomeStockForAmmoName({
        ammoName: "410番",
        ammoTypeStocks: [{ cartridgeType: "shotgun_shot", caliber: ".410", bookStock: 30 }],
      }),
    ).toBe(30);
  });
});
