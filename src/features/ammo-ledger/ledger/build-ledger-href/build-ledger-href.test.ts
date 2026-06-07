import { describe, expect, it } from "vitest";
import { buildLedgerHref } from "./build-ledger-href";

describe("buildLedgerHref", () => {
  it("用途をクエリに含めて帳簿画面へのリンクを作る", () => {
    expect(buildLedgerHref({ purpose: "shooting" })).toBe(
      "/lab/ammo-ledger/ledger?purpose=shooting",
    );
  });
});
