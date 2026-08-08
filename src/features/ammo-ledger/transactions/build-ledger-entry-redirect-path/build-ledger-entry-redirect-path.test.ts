import { describe, expect, it } from "vitest";
import { buildLedgerEntryRedirectPath } from "./build-ledger-entry-redirect-path";

describe("buildLedgerEntryRedirectPath", () => {
  it("用途と追加した帳簿行を遷移先へ含める", () => {
    expect(
      buildLedgerEntryRedirectPath({
        purpose: "hunting",
        ledgerEntryId: "entry-1",
      }),
    ).toBe("/lab/ammo-ledger/ledger?purpose=hunting&entry=entry-1");
  });
});
