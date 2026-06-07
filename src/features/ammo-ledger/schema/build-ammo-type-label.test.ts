import { describe, expect, it } from "vitest";
import { buildAmmoTypeLabel } from "./build-ammo-type-label";

describe("buildAmmoTypeLabel", () => {
  it("番径・単散弾・号数から表示名を組み立てる", () => {
    expect(
      buildAmmoTypeLabel({
        caliber: "12番",
        shotType: "shot",
        gaugeNumber: "5",
      }),
    ).toBe("12番 散弾 5号");
  });

  it("号数がなければ番径と単散弾のみ", () => {
    expect(
      buildAmmoTypeLabel({
        caliber: "12番",
        shotType: "slug",
      }),
    ).toBe("12番 単弾");
  });

  it("名称があれば名称を優先する", () => {
    expect(
      buildAmmoTypeLabel({
        name: "ウィンチェスター AA",
        caliber: "12番",
        shotType: "shot",
        gaugeNumber: "7.5",
      }),
    ).toBe("ウィンチェスター AA");
  });
});
