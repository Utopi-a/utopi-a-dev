import { describe, expect, it } from "vitest";
import { formatLedgerRemarks } from "./format-ledger-remarks";

describe("formatLedgerRemarks", () => {
  it("consume: location + ledgerNote", () => {
    expect(
      formatLedgerRemarks({
        category: "consume",
        location: "射撃場A",
        ledgerNote: "練習",
        counterpartyName: null,
      }),
    ).toBe("射撃場A 練習");
  });

  it("consume: locationのみ", () => {
    expect(
      formatLedgerRemarks({
        category: "consume",
        location: "射撃場A",
        ledgerNote: null,
        counterpartyName: null,
      }),
    ).toBe("射撃場A");
  });

  it("consume: ledgerNoteのみ", () => {
    expect(
      formatLedgerRemarks({
        category: "consume",
        location: null,
        ledgerNote: "大会用",
        counterpartyName: null,
      }),
    ).toBe("大会用");
  });

  it("consume: 両方nullで空文字", () => {
    expect(
      formatLedgerRemarks({
        category: "consume",
        location: null,
        ledgerNote: null,
        counterpartyName: null,
      }),
    ).toBe("");
  });

  it("consume: locationとledgerNoteが同じ場合は重複しない", () => {
    expect(
      formatLedgerRemarks({
        category: "consume",
        location: "射撃場A",
        ledgerNote: "射撃場A",
        counterpartyName: null,
      }),
    ).toBe("射撃場A");
  });

  it("acquire: 相手方名 + ledgerNote", () => {
    expect(
      formatLedgerRemarks({
        category: "acquire",
        location: null,
        ledgerNote: "追加購入",
        counterpartyName: "○○銃砲店",
      }),
    ).toBe("○○銃砲店 追加購入");
  });

  it("transfer: 相手方名のみ", () => {
    expect(
      formatLedgerRemarks({
        category: "transfer",
        location: null,
        ledgerNote: null,
        counterpartyName: "△△商店",
      }),
    ).toBe("△△商店");
  });

  it("acquire: 相手方名なしでledgerNoteのみ", () => {
    expect(
      formatLedgerRemarks({
        category: "acquire",
        location: null,
        ledgerNote: "知人より",
        counterpartyName: null,
      }),
    ).toBe("知人より");
  });

  it("acquire: 相手方名のみ", () => {
    expect(
      formatLedgerRemarks({
        category: "acquire",
        location: null,
        ledgerNote: null,
        counterpartyName: "○○銃砲店",
      }),
    ).toBe("○○銃砲店");
  });

  it("manufacture: ledgerNoteのみ", () => {
    expect(
      formatLedgerRemarks({
        category: "manufacture",
        location: null,
        ledgerNote: "自製",
        counterpartyName: null,
      }),
    ).toBe("自製");
  });

  it("carryover: ledgerNoteなしで空文字", () => {
    expect(
      formatLedgerRemarks({
        category: "carryover",
        location: null,
        ledgerNote: null,
        counterpartyName: null,
      }),
    ).toBe("");
  });
});
