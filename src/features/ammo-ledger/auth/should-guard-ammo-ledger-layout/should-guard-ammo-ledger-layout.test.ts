import { describe, expect, it } from "vitest";
import { shouldGuardAmmoLedgerLayout } from "@/features/ammo-ledger/auth/should-guard-ammo-ledger-layout/should-guard-ammo-ledger-layout";

describe("shouldGuardAmmoLedgerLayout", () => {
  it("通常ページでは認可ガードをかける", () => {
    expect(shouldGuardAmmoLedgerLayout({ pathname: "/lab/ammo-ledger" })).toBe(true);
    expect(shouldGuardAmmoLedgerLayout({ pathname: "/lab/ammo-ledger/ledger" })).toBe(true);
  });

  it("オフラインページでは認可ガードをかけない", () => {
    expect(shouldGuardAmmoLedgerLayout({ pathname: "/lab/ammo-ledger/~offline" })).toBe(false);
  });

  it("pathname が未取得のときは認可ガードをかける", () => {
    expect(shouldGuardAmmoLedgerLayout({ pathname: null })).toBe(true);
  });
});
