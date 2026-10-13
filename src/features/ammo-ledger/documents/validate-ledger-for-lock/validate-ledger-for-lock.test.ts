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
    expect(issues.filter((i) => i.kind === "negative_type_balance")).toEqual([
      {
        kind: "negative_type_balance",
        purpose: "shooting",
        entryId: "e1",
        occurredOn: "2026-01-15",
        message: "12番・散弾の種類別残が-55個になります",
        href: "/lab/ammo-ledger/ledger?purpose=shooting&entry=e1",
      },
    ]);
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
    const totalIssues = issues.filter((i) => i.kind === "negative_total_balance");
    expect(totalIssues.map((i) => i.message)).toEqual(["総残数が-100個になります"]);
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
    expect(issues.some((issue) => issue.kind.startsWith("negative_"))).toBe(false);
  });

  it("号数違いの弾種でも、印字する実包種類が同じなら種類別残を合算して検査する", () => {
    const entries = [
      makeEntry({
        id: "receive-95",
        ammoTypeId: "ammo-95",
        quantity: 100,
      }),
      makeEntry({
        id: "consume-75",
        ammoTypeId: "ammo-75",
        ammoTypeName: "12番 散弾 7.5号",
        ammoGaugeNumber: "7.5",
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
    expect(issues.some((issue) => issue.kind.startsWith("negative_"))).toBe(false);
  });

  it("印字する実包種類が違えば種類別残を分けて検査する", () => {
    const entries = [
      makeEntry({
        id: "receive-shot",
        ammoTypeId: "ammo-shot",
        quantity: 100,
      }),
      makeEntry({
        id: "consume-slug",
        ammoTypeId: "ammo-slug",
        ammoTypeName: "12番 単弾",
        ammoCartridgeType: "shotgun_slug",
        ammoGaugeNumber: null,
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
      issues.some(
        (issue) => issue.entryId === "consume-slug" && issue.kind === "negative_type_balance",
      ),
    ).toBe(true);
    expect(issues.some((issue) => issue.kind === "negative_total_balance")).toBe(false);
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

  it("負の残数は種類別・総残数ごとに最初の1件だけ示す", () => {
    const consume = {
      category: "consume",
      location: "射撃場A",
      gunNumber: "G001",
      counterpartyName: null,
      counterpartyAddress: null,
    };
    const entries = [
      makeEntry({ id: "c1", occurredOn: "2026-02-01", quantity: 25, ...consume }),
      makeEntry({ id: "c2", occurredOn: "2026-03-01", quantity: 25, ...consume }),
      makeEntry({ id: "c3", occurredOn: "2026-04-01", quantity: 25, ...consume }),
    ];
    const issues = validateLedgerForLock({ entries, from: "2026-01-01", to: "2026-12-31" });
    expect(issues.map((i) => [i.kind, i.entryId, i.message])).toEqual([
      ["negative_type_balance", "c1", "12番・散弾の種類別残が-25個になります"],
      ["negative_total_balance", "c1", "総残数が-25個になります"],
    ]);
  });

  describe("年初繰越の未登録", () => {
    const consumeIn2027 = makeEntry({
      id: "consume-2027",
      occurredOn: "2027-02-01",
      category: "consume",
      quantity: 25,
      location: "射撃場A",
      gunNumber: "G001",
      counterpartyName: null,
      counterpartyAddress: null,
    });
    const priorYear = [
      makeEntry({ id: "carryover-2026", occurredOn: "2026-01-01", category: "carryover" }),
      makeEntry({
        id: "consume-2026",
        occurredOn: "2026-12-31",
        category: "consume",
        quantity: 10,
        location: "射撃場A",
        gunNumber: "G001",
      }),
    ];

    it("前年末に残数があり1月1日の繰越がない用途は、先頭に未登録と年初繰越画面へのリンクを出す", () => {
      const issues = validateLedgerForLock({
        entries: [...priorYear, consumeIn2027],
        from: "2027-01-01",
        to: "2027-12-31",
      });
      expect(issues[0]).toEqual({
        kind: "missing_carryover",
        purpose: "shooting",
        entryId: null,
        occurredOn: "2027-01-01",
        message: "2027年の年初繰越が未登録です（前年末の帳簿残数 90個）",
        href: "/lab/ammo-ledger/settings/opening-balance?year=2027&purpose=shooting",
      });
      expect(issues.slice(1).map((i) => i.kind)).toEqual([
        "negative_type_balance",
        "negative_total_balance",
      ]);
    });

    it("1月1日に繰越があれば、0の繰越でも未登録としない", () => {
      const issues = validateLedgerForLock({
        entries: [
          ...priorYear,
          makeEntry({
            id: "carryover-2027",
            occurredOn: "2027-01-01",
            category: "carryover",
            quantity: 0,
          }),
        ],
        from: "2027-01-01",
        to: "2027-12-31",
      });
      expect(issues).toEqual([]);
    });

    it("その年に記録がない用途も、前年末の残数があれば未登録を知らせる", () => {
      const issues = validateLedgerForLock({
        entries: [
          ...priorYear,
          makeEntry({
            id: "hunting-2026",
            purpose: "hunting",
            occurredOn: "2026-05-01",
            quantity: 50,
          }),
          makeEntry({
            id: "carryover-2027",
            occurredOn: "2027-01-01",
            category: "carryover",
            quantity: 90,
          }),
        ],
        from: "2027-01-01",
        to: "2027-12-31",
      });
      expect(issues.map((i) => [i.kind, i.purpose, i.message])).toEqual([
        ["missing_carryover", "hunting", "2027年の年初繰越が未登録です（前年末の帳簿残数 50個）"],
      ]);
    });

    it("前年末の残数が0なら年初繰越がなくても未登録としない", () => {
      const issues = validateLedgerForLock({
        entries: [
          makeEntry({ id: "acquire-2026", occurredOn: "2026-05-01", quantity: 25 }),
          makeEntry({
            id: "consume-2026",
            occurredOn: "2026-06-01",
            category: "consume",
            quantity: 25,
            location: "射撃場A",
            gunNumber: "G001",
          }),
        ],
        from: "2027-01-01",
        to: "2027-12-31",
      });
      expect(issues).toEqual([]);
    });
  });

  it("未確認の弾種は用途によらない問題として弾種分類の確認へリンクする", () => {
    const issues = validateLedgerForLock({
      entries: [],
      from: "2026-01-01",
      to: "2026-09-01",
      unconfirmedAmmoTypeCount: 2,
    });
    expect(issues).toEqual([
      {
        kind: "unconfirmed_classification",
        purpose: null,
        entryId: null,
        occurredOn: "2026-09-01",
        message: "未確認の弾種が2件あります",
        href: "/lab/ammo-ledger/settings/ammo-types/review",
      },
    ]);
  });
});
