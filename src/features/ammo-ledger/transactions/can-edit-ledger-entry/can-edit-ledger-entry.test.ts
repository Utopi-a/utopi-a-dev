import { describe, expect, it } from "vitest";
import { canEditLedgerEntry } from "@/features/ammo-ledger/transactions/can-edit-ledger-entry/can-edit-ledger-entry";

describe("canEditLedgerEntry", () => {
  it("本人の確定済み消費記録は編集できる", () => {
    expect(
      canEditLedgerEntry({
        entryUserId: "user-1",
        requestUserId: "user-1",
        voidedAt: null,
        category: "consume",
        transactionStatus: "confirmed",
      }),
    ).toBe(true);
  });

  it("取消済みは編集できない", () => {
    expect(
      canEditLedgerEntry({
        entryUserId: "user-1",
        requestUserId: "user-1",
        voidedAt: new Date(),
        category: "consume",
        transactionStatus: "confirmed",
      }),
    ).toBe(false);
  });

  it("製造区分は編集できない", () => {
    expect(
      canEditLedgerEntry({
        entryUserId: "user-1",
        requestUserId: "user-1",
        voidedAt: null,
        category: "manufacture",
        transactionStatus: "confirmed",
      }),
    ).toBe(false);
  });
});
