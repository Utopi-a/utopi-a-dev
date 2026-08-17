import { describe, expect, it } from "vitest";
import type { LedgerEntryForValidation } from "./validate-ledger-for-lock";
import { validateLedgerForLock } from "./validate-ledger-for-lock";

function makeEntry(overrides: Partial<LedgerEntryForValidation> = {}): LedgerEntryForValidation {
  return {
    id: "e1",
    occurredOn: "2026-01-15",
    category: "acquire",
    purpose: "shooting",
    ammoTypeId: "ammo-1",
    ammoTypeName: "12番 散弾 9.5号",
    ammoCartridgeType: "shotgun_shot",
    ammoCaliber: "12番",
    ammoGaugeNumber: "9.5",
    quantity: 100,
    location: null,
    gunPermitNumber: null,
    gunNumber: null,
    counterpartyName: "テスト店",
    counterpartyAddress: "東京都",
    voidedAt: null,
    dayOrder: 0,
    createdAt: new Date("2026-01-15T00:00:00Z"),
    ...overrides,
  };
}

describe("validateLedgerForLock", () => {
  it("正常なデータではissueなし", () => {
    const entries = [
      makeEntry({
        id: "e1",
        category: "carryover",
        quantity: 100,
        counterpartyName: null,
        counterpartyAddress: null,
      }),
      makeEntry({ id: "e2", category: "acquire", quantity: 50 }),
    ];
    const issues = validateLedgerForLock({ entries, from: "2026-01-01", to: "2026-12-31" });
    expect(issues).toHaveLength(0);
  });

  it("種類別残が負を検出する（テスト弾 -55のケース）", () => {
    const entries = [
      makeEntry({
        id: "e1",
        category: "consume",
        quantity: 55,
        ammoTypeName: "テスト弾",
        ammoCartridgeType: "shotgun_shot",
        ammoCaliber: "12番",
        location: "テスト射撃場",
        gunPermitNumber: "P001",
        counterpartyName: null,
        counterpartyAddress: null,
      }),
    ];
    const issues = validateLedgerForLock({ entries, from: "2026-01-01", to: "2026-12-31" });
    const balanceIssues = issues.filter((i) => i.message.includes("テスト弾 -55"));
    expect(balanceIssues.length).toBeGreaterThanOrEqual(1);
  });

  it("総残が負を検出する", () => {
    const entries = [
      makeEntry({
        id: "e1",
        category: "consume",
        quantity: 100,
        location: "射撃場A",
        gunPermitNumber: "P001",
        counterpartyName: null,
        counterpartyAddress: null,
      }),
    ];
    const issues = validateLedgerForLock({ entries, from: "2026-01-01", to: "2026-12-31" });
    const totalIssues = issues.filter((i) => i.message.includes("総残が負"));
    expect(totalIssues.length).toBeGreaterThanOrEqual(1);
  });

  it("ammoCartridgeType/ammoCaliber不足を検出する", () => {
    const entries = [
      makeEntry({
        id: "e1",
        category: "acquire",
        ammoCartridgeType: null,
        ammoCaliber: null,
      }),
    ];
    const issues = validateLedgerForLock({ entries, from: "2026-01-01", to: "2026-12-31" });
    expect(issues.some((i) => i.message.includes("実包種類情報が不足"))).toBe(true);
  });

  it("carryoverでもammoCartridgeType不足を検出する", () => {
    const entries = [
      makeEntry({
        id: "e1",
        category: "carryover",
        ammoCartridgeType: null,
        ammoCaliber: null,
        counterpartyName: null,
        counterpartyAddress: null,
      }),
    ];
    const issues = validateLedgerForLock({ entries, from: "2026-01-01", to: "2026-12-31" });
    expect(issues.some((i) => i.message.includes("実包種類情報が不足"))).toBe(true);
  });

  it("同日の残数はdayOrder順で検査する", () => {
    const entries = [
      makeEntry({
        id: "consume",
        category: "consume",
        quantity: 50,
        location: "射撃場A",
        gunNumber: "G001",
        counterpartyName: null,
        counterpartyAddress: null,
        dayOrder: 1,
      }),
      makeEntry({
        id: "acquire",
        category: "acquire",
        quantity: 50,
        dayOrder: 0,
      }),
    ];

    const issues = validateLedgerForLock({ entries, from: "2026-01-01", to: "2026-12-31" });
    expect(issues.some((issue) => issue.message.includes("残が負"))).toBe(false);
  });

  it("表示名が同じでも異なる弾種IDの残数を混在させない", () => {
    const entries = [
      makeEntry({
        id: "receive-a",
        ammoTypeId: "ammo-a",
        quantity: 100,
      }),
      makeEntry({
        id: "consume-b",
        ammoTypeId: "ammo-b",
        category: "consume",
        quantity: 10,
        occurredOn: "2026-01-16",
        location: "射撃場A",
        gunNumber: "G001",
        counterpartyName: null,
        counterpartyAddress: null,
      }),
    ];

    const issues = validateLedgerForLock({ entries, from: "2026-01-01", to: "2026-12-31" });
    expect(
      issues.some((issue) => issue.entryId === "consume-b" && issue.message.includes("-10")),
    ).toBe(true);
  });

  it("consumeでlocation不足を検出する", () => {
    const entries = [
      makeEntry({
        id: "e0",
        category: "carryover",
        quantity: 200,
        counterpartyName: null,
        counterpartyAddress: null,
      }),
      makeEntry({
        id: "e1",
        occurredOn: "2026-02-01",
        category: "consume",
        quantity: 10,
        location: null,
        gunPermitNumber: "P001",
        counterpartyName: null,
        counterpartyAddress: null,
      }),
    ];
    const issues = validateLedgerForLock({ entries, from: "2026-01-01", to: "2026-12-31" });
    expect(issues.some((i) => i.message.includes("射撃場所が未設定"))).toBe(true);
  });

  it("consumeでgunPermitNumber/gunNumber両方不足を検出する", () => {
    const entries = [
      makeEntry({
        id: "e0",
        category: "carryover",
        quantity: 200,
        counterpartyName: null,
        counterpartyAddress: null,
      }),
      makeEntry({
        id: "e1",
        occurredOn: "2026-02-01",
        category: "consume",
        quantity: 10,
        location: "射撃場A",
        gunPermitNumber: null,
        gunNumber: null,
        counterpartyName: null,
        counterpartyAddress: null,
      }),
    ];
    const issues = validateLedgerForLock({ entries, from: "2026-01-01", to: "2026-12-31" });
    expect(issues.some((i) => i.message.includes("使用銃（許可番号または銃番号）が未設定"))).toBe(
      true,
    );
  });

  it("consumeでgunNumberがあればgun不足にならない", () => {
    const entries = [
      makeEntry({
        id: "e0",
        category: "carryover",
        quantity: 200,
        counterpartyName: null,
        counterpartyAddress: null,
      }),
      makeEntry({
        id: "e1",
        occurredOn: "2026-02-01",
        category: "consume",
        quantity: 10,
        location: "射撃場A",
        gunPermitNumber: null,
        gunNumber: "G001",
        counterpartyName: null,
        counterpartyAddress: null,
      }),
    ];
    const issues = validateLedgerForLock({ entries, from: "2026-01-01", to: "2026-12-31" });
    expect(issues.some((i) => i.message.includes("使用銃"))).toBe(false);
  });

  it("acquire/transfer/issue/receiveでcounterpartyName不足を検出する", () => {
    const entries = [
      makeEntry({
        id: "e1",
        category: "acquire",
        counterpartyName: null,
        counterpartyAddress: "東京都",
      }),
    ];
    const issues = validateLedgerForLock({ entries, from: "2026-01-01", to: "2026-12-31" });
    expect(issues.some((i) => i.message.includes("相手方名称が未設定"))).toBe(true);
  });

  it("acquire/transfer/issue/receiveでcounterpartyAddress不足を検出する", () => {
    const entries = [
      makeEntry({
        id: "e1",
        category: "transfer",
        counterpartyName: "テスト",
        counterpartyAddress: null,
      }),
    ];
    const issues = validateLedgerForLock({ entries, from: "2026-01-01", to: "2026-12-31" });
    expect(issues.some((i) => i.message.includes("相手方住所が未設定"))).toBe(true);
  });

  it("voided entriesは対象外", () => {
    const entries = [
      makeEntry({
        id: "e1",
        category: "consume",
        quantity: 100,
        location: null,
        gunPermitNumber: null,
        gunNumber: null,
        counterpartyName: null,
        counterpartyAddress: null,
        voidedAt: new Date("2026-03-01"),
      }),
    ];
    const issues = validateLedgerForLock({ entries, from: "2026-01-01", to: "2026-12-31" });
    expect(issues).toHaveLength(0);
  });

  it("期間外のentriesは対象外", () => {
    const entries = [
      makeEntry({
        id: "e1",
        occurredOn: "2025-12-31",
        category: "consume",
        quantity: 100,
        location: null,
        counterpartyName: null,
        counterpartyAddress: null,
      }),
    ];
    const issues = validateLedgerForLock({ entries, from: "2026-01-01", to: "2026-12-31" });
    expect(issues).toHaveLength(0);
  });
});
