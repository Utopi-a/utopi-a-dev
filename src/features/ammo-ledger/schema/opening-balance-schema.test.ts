import { describe, expect, it } from "vitest";
import { openingBalanceInputSchema } from "./opening-balance-schema";

describe("openingBalanceInputSchema", () => {
  it("許可残数がある場合は有効期限が必須", () => {
    const result = openingBalanceInputSchema.safeParse({
      year: 2026,
      purpose: "shooting",
      permitBalance: 1200,
      permitExpiresOn: null,
      stockByAmmoType: {},
    });

    expect(result.success).toBe(false);
  });

  it("許可残数がある場合は繰越日以降の有効期限が必要", () => {
    const result = openingBalanceInputSchema.safeParse({
      year: 2026,
      purpose: "shooting",
      permitBalance: 1200,
      permitExpiresOn: "2025-12-31",
      stockByAmmoType: {},
    });

    expect(result.success).toBe(false);
  });

  it("許可残数がなければ有効期限なしでも保存できる", () => {
    const result = openingBalanceInputSchema.safeParse({
      year: 2026,
      purpose: "shooting",
      permitBalance: null,
      permitExpiresOn: null,
      stockByAmmoType: { "ammo-1": 100 },
    });

    expect(result.success).toBe(true);
  });
});
