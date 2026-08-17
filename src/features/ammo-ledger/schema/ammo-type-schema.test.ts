import { describe, expect, it } from "vitest";
import { ammoTypeSchema } from "./ammo-type-schema";

describe("ammoTypeSchema", () => {
  it("名称なし・号数ありの散弾入力を受け付ける", () => {
    const result = ammoTypeSchema.safeParse({
      caliber: "12番",
      cartridgeType: "shotgun_shot",
      gaugeNumber: "5",
      roundsPerBox: 25,
    });
    expect(result.success).toBe(true);
  });

  it("ライフル弾種の入力を受け付ける", () => {
    const result = ammoTypeSchema.safeParse({
      caliber: ".308WIN",
      cartridgeType: "rifle",
      roundsPerBox: 20,
    });
    expect(result.success).toBe(true);
  });

  it("名称ありの入力も受け付ける", () => {
    const result = ammoTypeSchema.safeParse({
      name: "12番 散弾",
      caliber: "12番",
      cartridgeType: "shotgun_shot",
      roundsPerBox: 25,
    });
    expect(result.success).toBe(true);
  });

  it("1箱あたり発数が0以下なら拒否する", () => {
    const result = ammoTypeSchema.safeParse({
      name: "12番 散弾",
      caliber: "12番",
      cartridgeType: "shotgun_shot",
      roundsPerBox: 0,
    });
    expect(result.success).toBe(false);
  });
});
