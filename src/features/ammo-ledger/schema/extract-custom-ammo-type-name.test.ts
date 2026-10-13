import { describe, expect, it } from "vitest";
import { buildAmmoTypeLabel } from "./build-ammo-type-label";
import { extractCustomAmmoTypeName } from "./extract-custom-ammo-type-name";

describe("extractCustomAmmoTypeName", () => {
  it("属性から自動で作った名前は、名称なしとして扱う", () => {
    expect(
      extractCustomAmmoTypeName({
        name: "12番 散弾 7.5号",
        caliber: "12番",
        cartridgeType: "shotgun_shot",
        gaugeNumber: "7.5",
      }),
    ).toBe("");
    expect(
      extractCustomAmmoTypeName({ name: ".308WIN", caliber: ".308WIN", cartridgeType: "rifle" }),
    ).toBe("");
    expect(
      extractCustomAmmoTypeName({
        name: "12番 単弾",
        caliber: "12番",
        cartridgeType: "shotgun_slug",
        gaugeNumber: null,
      }),
    ).toBe("");
  });

  it("自動で作った名前の弾種は、号数や番径を変えると新しい属性の名前になる", () => {
    const stored = { name: "12番 散弾 7.5号", caliber: "12番", gaugeNumber: "7.5" };
    const name = extractCustomAmmoTypeName({ ...stored, cartridgeType: "shotgun_shot" });

    expect(
      buildAmmoTypeLabel({
        name,
        caliber: "12番",
        cartridgeType: "shotgun_shot",
        gaugeNumber: "9",
      }),
    ).toBe("12番 散弾 9号");
    expect(
      buildAmmoTypeLabel({
        name,
        caliber: "20番",
        cartridgeType: "shotgun_shot",
        gaugeNumber: "7.5",
      }),
    ).toBe("20番 散弾 7.5号");
  });

  it("利用者が付けた名称は残し、保存時に付けた号数だけを外す", () => {
    const name = extractCustomAmmoTypeName({
      name: "ウィンチェスター AA 7.5号",
      caliber: "12番",
      cartridgeType: "shotgun_shot",
      gaugeNumber: "7.5",
    });

    expect(name).toBe("ウィンチェスター AA");
    expect(
      buildAmmoTypeLabel({
        name,
        caliber: "12番",
        cartridgeType: "shotgun_shot",
        gaugeNumber: "9",
      }),
    ).toBe("ウィンチェスター AA 9号");
  });

  it("号数のない名称はそのまま返す", () => {
    expect(
      extractCustomAmmoTypeName({
        name: "FMJ 150gr",
        caliber: ".308WIN",
        cartridgeType: "rifle",
      }),
    ).toBe("FMJ 150gr");
    expect(
      extractCustomAmmoTypeName({
        name: "スラッグ弾",
        caliber: "12番",
        cartridgeType: "shotgun_slug",
        gaugeNumber: null,
      }),
    ).toBe("スラッグ弾");
  });
});
