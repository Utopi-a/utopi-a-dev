import { describe, expect, it } from "vitest";
import { canVoidLedgerEntry } from "./can-void-ledger-entry";

describe("canVoidLedgerEntry", () => {
  it("未取消の自分の記録は取消可能", () => {
    expect(
      canVoidLedgerEntry({
        entryUserId: "user-1",
        requestUserId: "user-1",
        voidedAt: null,
      }),
    ).toBe(true);
  });

  it("他人の記録は取消不可", () => {
    expect(
      canVoidLedgerEntry({
        entryUserId: "user-1",
        requestUserId: "user-2",
        voidedAt: null,
      }),
    ).toBe(false);
  });

  it("既に取消済みなら不可", () => {
    expect(
      canVoidLedgerEntry({
        entryUserId: "user-1",
        requestUserId: "user-1",
        voidedAt: new Date(),
      }),
    ).toBe(false);
  });
});
