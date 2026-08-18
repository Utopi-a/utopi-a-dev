import { describe, expect, it } from "vitest";
import type { ammoLedgerEntry, ammoTransaction } from "@/db/schema/ammo-ledger";
import { buildTransactionEditInitialValues } from "./build-transaction-edit-initial-values";

type LedgerEntry = typeof ammoLedgerEntry.$inferSelect;
type Transaction = typeof ammoTransaction.$inferSelect;

const createdAt = new Date("2026-08-01T00:00:00.000Z");
const updatedAt = new Date("2026-08-02T00:00:00.000Z");

const baseEntry: LedgerEntry = {
  id: "entry-1",
  userId: "user-1",
  transactionId: "transaction-1",
  category: "consume",
  purpose: "shooting",
  occurredOn: "2026-08-01",
  ammoTypeId: "entry-ammo",
  ammoTypeName: "12番散弾",
  ammoCartridgeType: "shotgun",
  ammoCaliber: null,
  ammoGaugeNumber: "12",
  quantity: 25,
  location: "法定帳簿の場所",
  ledgerNote: "法定帳簿の注記",
  counterpartyName: null,
  counterpartyAddress: null,
  gunId: "entry-gun",
  gunName: "法定帳簿の銃",
  gunNumber: "123",
  gunPermitNumber: "permit-1",
  voidedAt: null,
  dayOrder: 0,
  createdAt,
  updatedAt,
};

const baseTransaction: Transaction = {
  id: "transaction-1",
  userId: "user-1",
  status: "recorded",
  inputKind: "consume",
  purpose: "hunting",
  occurredOn: "2026-07-31",
  ammoTypeId: "transaction-ammo",
  gunId: "gun-682",
  rangeId: "range-1",
  counterpartyId: null,
  outerBoxCount: 1,
  boxCount: 2,
  looseRounds: 3,
  computedRounds: 28,
  counterpartyName: null,
  counterpartyAddress: null,
  memo: "transactionのメモ",
  sourceTransactionId: null,
  createdAt,
  updatedAt,
};

describe("buildTransactionEditInitialValues", () => {
  it("射撃記録では法定帳簿entryの弾種・銃・数量を優先する", () => {
    const result = buildTransactionEditInitialValues({
      entry: baseEntry,
      transaction: baseTransaction,
      registeredCounterpartyIds: new Set(),
    });

    expect(result).toMatchObject({
      ledgerEntryId: "entry-1",
      originalQuantity: 25,
      purpose: "shooting",
      occurredOn: "2026-08-01",
      ammoTypeId: "entry-ammo",
      gunId: "entry-gun",
      ledgerNote: "法定帳簿の注記",
      rangeId: "range-1",
      outerBoxCount: 0,
      boxCount: 0,
      looseRounds: 25,
    });
  });

  it("狩猟記録では法定帳簿entryの場所を初期値にする", () => {
    const result = buildTransactionEditInitialValues({
      entry: {
        ...baseEntry,
        purpose: "hunting",
        location: "北海道の狩猟場所",
      },
      transaction: {
        ...baseTransaction,
        rangeId: null,
      },
      registeredCounterpartyIds: new Set(),
    });

    expect(result.location).toBe("北海道の狩猟場所");
  });

  it("包装内訳・memo・登録済み相手方IDはtransaction由来を維持する", () => {
    const result = buildTransactionEditInitialValues({
      entry: {
        ...baseEntry,
        category: "issue",
        counterpartyName: "法定帳簿の相手方",
        counterpartyAddress: "法定帳簿の住所",
      },
      transaction: {
        ...baseTransaction,
        inputKind: "issue",
        ammoTypeId: "entry-ammo",
        counterpartyId: "counterparty-1",
      },
      registeredCounterpartyIds: new Set(["counterparty-1"]),
    });

    expect(result).toMatchObject({
      outerBoxCount: 1,
      boxCount: 2,
      looseRounds: 3,
      memo: "transactionのメモ",
      counterpartyId: "counterparty-1",
    });
    expect(result.counterpartyName).toBeUndefined();
    expect(result.counterpartyAddress).toBeUndefined();
  });
});
