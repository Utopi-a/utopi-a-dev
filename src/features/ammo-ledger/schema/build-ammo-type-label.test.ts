import { describe, expect, it } from "vitest";
import { buildAmmoTypeLabel } from "./build-ammo-type-label";

describe("buildAmmoTypeLabel", () => {
  it("ライフルは口径を名称として表示する", () => {
    expect(
      buildAmmoTypeLabel({
        caliber: ".308WIN",
        cartridgeType: "rifle",
      }),
    ).toBe(".308WIN");
  });

  it("ショットガン単弾は番径と単弾を表示する", () => {
    expect(
      buildAmmoTypeLabel({
        caliber: "12番",
        cartridgeType: "shotgun_slug",
      }),
    ).toBe("12番 単弾");
  });

  it("ショットガン散弾は番径・散弾・号数から表示名を組み立てる", () => {
    expect(
      buildAmmoTypeLabel({
        caliber: "12番",
        cartridgeType: "shotgun_shot",
        gaugeNumber: "5",
      }),
    ).toBe("12番 散弾 5号");
  });

  it("号数がなければ番径と散弾のみ", () => {
    expect(
      buildAmmoTypeLabel({
        caliber: "12番",
        cartridgeType: "shotgun_shot",
      }),
    ).toBe("12番 散弾");
  });

  it("9.5号はそのまま表示する", () => {
    expect(
      buildAmmoTypeLabel({
        caliber: "12番",
        cartridgeType: "shotgun_shot",
        gaugeNumber: "9.5",
      }),
    ).toBe("12番 散弾 9.5号");
  });

  it("名称があっても散弾のみ号数を後ろに付ける", () => {
    expect(
      buildAmmoTypeLabel({
        name: "ウィンチェスター AA",
        caliber: "12番",
        cartridgeType: "shotgun_shot",
        gaugeNumber: "7.5",
      }),
    ).toBe("ウィンチェスター AA 7.5号");
  });

  it("名称に同じ号数が含まれる場合は重複して付けない", () => {
    expect(
      buildAmmoTypeLabel({
        name: "12番 散弾 7.5号",
        caliber: "12番",
        cartridgeType: "shotgun_shot",
        gaugeNumber: "7.5",
      }),
    ).toBe("12番 散弾 7.5号");
  });

  it("名称のみで号数がなければ名称だけ", () => {
    expect(
      buildAmmoTypeLabel({
        name: "スラッグ弾",
        caliber: "12番",
        cartridgeType: "shotgun_slug",
      }),
    ).toBe("スラッグ弾");
  });

  it("ライフルで名称があれば名称を優先する", () => {
    expect(
      buildAmmoTypeLabel({
        name: "FMJ 150gr",
        caliber: ".308WIN",
        cartridgeType: "rifle",
      }),
    ).toBe("FMJ 150gr");
  });
});
