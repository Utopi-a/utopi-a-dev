import { describe, expect, it } from "vitest";
import { buildOpeningBalanceHref } from "./build-opening-balance-href";

describe("buildOpeningBalanceHref", () => {
  it("年と用途をクエリに含めて年初繰越画面へのリンクを作る", () => {
    expect(
      buildOpeningBalanceHref({
        occurredOn: "2026-01-01",
        purpose: "shooting",
      }),
    ).toBe("/lab/ammo-ledger/settings/opening-balance?year=2026&purpose=shooting");
  });
});
