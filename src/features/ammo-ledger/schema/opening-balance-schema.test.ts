import { describe, expect, it } from "vitest";
import { openingBalanceInputSchema } from "./opening-balance-schema";

describe("openingBalanceInputSchema", () => {
  it("許可繰越がある場合は繰越日以降の有効期限が必要", () => {
    const result = openingBalanceInputSchema.safeParse({
      year: 2026,
      purpose: "shooting",
      permitCarryovers: [
        {
          name: "12番",
          permitPurpose: "標的射撃",
          quantity: 1200,
          expiresOn: "2025-12-31",
        },
      ],
      stockByAmmoType: {},
    });

    expect(result.success).toBe(false);
  });

  it("許可繰越が空でも保存できる", () => {
    const result = openingBalanceInputSchema.safeParse({
      year: 2026,
      purpose: "shooting",
      permitCarryovers: [],
      stockByAmmoType: { "ammo-1": 100 },
    });

    expect(result.success).toBe(true);
  });
});
