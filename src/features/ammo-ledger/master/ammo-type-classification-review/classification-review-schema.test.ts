import { describe, expect, it } from "vitest";
import {
  confirmClassificationSchema,
  correctOrphanEntrySchema,
} from "./classification-review-schema";

describe("confirmClassificationSchema", () => {
  it("ライフル弾種の確認入力を受け付ける", () => {
    const result = confirmClassificationSchema.safeParse({
      ammoTypeId: "abc-123",
      cartridgeType: "rifle",
      caliber: ".308WIN",
    });
    expect(result.success).toBe(true);
  });

  it("散弾で号数ありの入力を受け付ける", () => {
    const result = confirmClassificationSchema.safeParse({
      ammoTypeId: "abc-123",
      cartridgeType: "shotgun_shot",
      caliber: "12番",
      gaugeNumber: "7.5",
    });
    expect(result.success).toBe(true);
  });

  it("単弾の入力を受け付ける", () => {
    const result = confirmClassificationSchema.safeParse({
      ammoTypeId: "abc-123",
      cartridgeType: "shotgun_slug",
      caliber: "12番",
    });
    expect(result.success).toBe(true);
  });

  it("ammoTypeIdが空なら拒否する", () => {
    const result = confirmClassificationSchema.safeParse({
      ammoTypeId: "",
      cartridgeType: "rifle",
      caliber: ".308WIN",
    });
    expect(result.success).toBe(false);
  });

  it("caliberが空なら拒否する", () => {
    const result = confirmClassificationSchema.safeParse({
      ammoTypeId: "abc-123",
      cartridgeType: "rifle",
      caliber: "",
    });
    expect(result.success).toBe(false);
  });

  it("不正なcartridgeTypeを拒否する", () => {
    const result = confirmClassificationSchema.safeParse({
      ammoTypeId: "abc-123",
      cartridgeType: "unknown",
      caliber: ".308WIN",
    });
    expect(result.success).toBe(false);
  });
});

describe("correctOrphanEntrySchema", () => {
  it("孤立記録の補正入力を受け付ける", () => {
    const result = correctOrphanEntrySchema.safeParse({
      ledgerEntryId: "entry-1",
      cartridgeType: "shotgun_shot",
      caliber: "12番",
      gaugeNumber: "5",
    });
    expect(result.success).toBe(true);
  });

  it("ledgerEntryIdが空なら拒否する", () => {
    const result = correctOrphanEntrySchema.safeParse({
      ledgerEntryId: "",
      cartridgeType: "rifle",
      caliber: ".308WIN",
    });
    expect(result.success).toBe(false);
  });

  it("号数なしの散弾入力も受け付ける", () => {
    const result = correctOrphanEntrySchema.safeParse({
      ledgerEntryId: "entry-1",
      cartridgeType: "shotgun_shot",
      caliber: "12番",
    });
    expect(result.success).toBe(true);
  });
});
