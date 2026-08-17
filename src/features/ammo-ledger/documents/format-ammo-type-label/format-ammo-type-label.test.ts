import { describe, expect, it } from "vitest";
import { formatAmmoTypeLabel } from "./format-ammo-type-label";

describe("formatAmmoTypeLabel", () => {
  it("rifle: ammoTypeNameを返す", () => {
    expect(
      formatAmmoTypeLabel({
        snapshot: {
          ammoCartridgeType: "rifle",
          ammoCaliber: ".308 Win",
          ammoGaugeNumber: null,
          ammoTypeName: "レミントンコアロクト",
        },
      }),
    ).toBe("レミントンコアロクト");
  });

  it("rifle: ammoTypeNameが空ならammoCaliberにfallback", () => {
    expect(
      formatAmmoTypeLabel({
        snapshot: {
          ammoCartridgeType: "rifle",
          ammoCaliber: ".308 Win",
          ammoGaugeNumber: null,
          ammoTypeName: "",
        },
      }),
    ).toBe(".308 Win");
  });

  it("shotgun_slug: 番径・単弾を構成", () => {
    expect(
      formatAmmoTypeLabel({
        snapshot: {
          ammoCartridgeType: "shotgun_slug",
          ammoCaliber: "12番",
          ammoGaugeNumber: null,
          ammoTypeName: "12番スラッグ",
        },
      }),
    ).toBe("12番・単弾");
  });

  it("shotgun_slug: ammoCaliber不足時はammoTypeNameにfallback", () => {
    expect(
      formatAmmoTypeLabel({
        snapshot: {
          ammoCartridgeType: "shotgun_slug",
          ammoCaliber: null,
          ammoGaugeNumber: null,
          ammoTypeName: "旧スラッグ弾",
        },
      }),
    ).toBe("旧スラッグ弾");
  });

  it("shotgun_shot: 番径・散弾を構成", () => {
    expect(
      formatAmmoTypeLabel({
        snapshot: {
          ammoCartridgeType: "shotgun_shot",
          ammoCaliber: "12番",
          ammoGaugeNumber: null,
          ammoTypeName: "12番散弾",
        },
      }),
    ).toBe("12番・散弾");
  });

  it("shotgun_shot: gaugeNumberがあっても号数を表示しない", () => {
    expect(
      formatAmmoTypeLabel({
        snapshot: {
          ammoCartridgeType: "shotgun_shot",
          ammoCaliber: "12番",
          ammoGaugeNumber: "9.5",
          ammoTypeName: "12番 散弾 9.5号",
        },
      }),
    ).toBe("12番・散弾");
  });

  it("shotgun_shot: ammoCaliber不足時はammoTypeNameにfallback", () => {
    expect(
      formatAmmoTypeLabel({
        snapshot: {
          ammoCartridgeType: "shotgun_shot",
          ammoCaliber: null,
          ammoGaugeNumber: "7.5",
          ammoTypeName: "クレー 7.5号",
        },
      }),
    ).toBe("クレー 7.5号");
  });

  it("ammoCartridgeTypeがnullならammoTypeNameをそのまま返す", () => {
    expect(
      formatAmmoTypeLabel({
        snapshot: {
          ammoCartridgeType: null,
          ammoCaliber: null,
          ammoGaugeNumber: null,
          ammoTypeName: "テスト弾",
        },
      }),
    ).toBe("テスト弾");
  });
});
