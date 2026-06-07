import { describe, expect, it } from "vitest";
import { validateLedgerEntry } from "./validate-ledger-entry";

const baseEntry = {
  occurredOn: "2026-06-07",
  ammoTypeId: "ammo-1",
  ammoTypeName: "12番 散弾",
  quantity: 73,
};

describe("validateLedgerEntry", () => {
  it("消費の必須項目が揃っていれば valid", () => {
    const result = validateLedgerEntry({
      category: "consume",
      ...baseEntry,
      location: "成田射撃場 千葉県成田市",
      gunId: "gun-1",
      gunPermitNumber: "12345",
      counterpartyName: null,
      counterpartyAddress: null,
    });

    expect(result).toEqual({ valid: true, missingFields: [] });
  });

  it("消費で場所が未入力なら invalid", () => {
    const result = validateLedgerEntry({
      category: "consume",
      ...baseEntry,
      location: null,
      gunId: "gun-1",
      gunPermitNumber: "12345",
      counterpartyName: null,
      counterpartyAddress: null,
    });

    expect(result.valid).toBe(false);
    expect(result.missingFields).toContain("消費場所");
  });

  it("譲受で相手方が未入力なら invalid", () => {
    const result = validateLedgerEntry({
      category: "acquire",
      ...baseEntry,
      location: null,
      gunId: null,
      gunPermitNumber: null,
      counterpartyName: null,
      counterpartyAddress: "東京都",
    });

    expect(result.valid).toBe(false);
    expect(result.missingFields).toContain("相手方氏名");
  });

  it("譲渡で相手方住所が未入力なら invalid", () => {
    const result = validateLedgerEntry({
      category: "transfer",
      ...baseEntry,
      location: null,
      gunId: null,
      gunPermitNumber: null,
      counterpartyName: "山田太郎",
      counterpartyAddress: null,
    });

    expect(result.valid).toBe(false);
    expect(result.missingFields).toContain("相手方住所");
  });

  it("廃棄は日付・種類・数量のみで valid", () => {
    const result = validateLedgerEntry({
      category: "dispose",
      ...baseEntry,
      location: null,
      gunId: null,
      gunPermitNumber: null,
      counterpartyName: null,
      counterpartyAddress: null,
    });

    expect(result).toEqual({ valid: true, missingFields: [] });
  });
});
