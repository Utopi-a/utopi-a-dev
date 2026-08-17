import { describe, expect, it } from "vitest";
import { buildLedgerBodyRows } from "./build-ledger-body-rows";

function makeEntry(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    id: "e1",
    userId: "u1",
    transactionId: "t1",
    category: "acquire",
    purpose: "shooting",
    occurredOn: "2026-01-15",
    ammoTypeId: "a1",
    ammoTypeName: "クレー 7.5号",
    ammoCartridgeType: null,
    ammoCaliber: null,
    ammoGaugeNumber: null,
    quantity: 100,
    location: null,
    ledgerNote: null,
    counterpartyName: null,
    counterpartyAddress: null,
    gunId: null,
    gunName: null,
    gunNumber: null,
    gunPermitNumber: null,
    voidedAt: null,
    dayOrder: 0,
    createdAt: new Date("2026-01-15T00:00:00Z"),
    updatedAt: new Date("2026-01-15T00:00:00Z"),
    ...overrides,
  } as Parameters<typeof buildLedgerBodyRows>[0]["entries"][number];
}

describe("buildLedgerBodyRows", () => {
  it("繰越→譲受→消費の順にrunning balanceを計算する", () => {
    const entries = [
      makeEntry({
        id: "e0",
        category: "carryover",
        occurredOn: "2026-01-01",
        quantity: 200,
        ammoTypeName: "クレー 7.5号",
        dayOrder: 0,
        createdAt: new Date("2026-01-01T00:00:00Z"),
      }),
      makeEntry({
        id: "e1",
        category: "acquire",
        occurredOn: "2026-01-15",
        quantity: 100,
        ammoTypeName: "クレー 7.5号",
        dayOrder: 0,
        createdAt: new Date("2026-01-15T00:00:00Z"),
      }),
      makeEntry({
        id: "e2",
        category: "consume",
        occurredOn: "2026-02-01",
        quantity: 50,
        ammoTypeName: "クレー 7.5号",
        dayOrder: 0,
        createdAt: new Date("2026-02-01T00:00:00Z"),
      }),
    ];

    const rows = buildLedgerBodyRows({ entries });

    expect(rows).toHaveLength(3);
    expect(rows[0].no).toBe(1);
    expect(rows[0].flow).toBe("receive");
    expect(rows[0].balanceByType).toBe(200);
    expect(rows[0].totalBalance).toBe(200);

    expect(rows[1].no).toBe(2);
    expect(rows[1].flow).toBe("receive");
    expect(rows[1].balanceByType).toBe(300);
    expect(rows[1].totalBalance).toBe(300);

    expect(rows[2].no).toBe(3);
    expect(rows[2].flow).toBe("pay");
    expect(rows[2].balanceByType).toBe(250);
    expect(rows[2].totalBalance).toBe(250);
  });

  it("異なる実包種類の種類別残は独立して計算される", () => {
    const entries = [
      makeEntry({
        id: "e1",
        category: "acquire",
        occurredOn: "2026-01-15",
        quantity: 100,
        ammoTypeName: "クレー 7.5号",
        createdAt: new Date("2026-01-15T00:00:00Z"),
      }),
      makeEntry({
        id: "e2",
        ammoTypeId: "a2",
        category: "acquire",
        occurredOn: "2026-01-16",
        quantity: 50,
        ammoTypeName: "スラッグ",
        createdAt: new Date("2026-01-16T00:00:00Z"),
      }),
      makeEntry({
        id: "e3",
        category: "consume",
        occurredOn: "2026-02-01",
        quantity: 25,
        ammoTypeName: "クレー 7.5号",
        createdAt: new Date("2026-02-01T00:00:00Z"),
      }),
    ];

    const rows = buildLedgerBodyRows({ entries });

    expect(rows[0].balanceByType).toBe(100);
    expect(rows[0].totalBalance).toBe(100);

    expect(rows[1].balanceByType).toBe(50);
    expect(rows[1].totalBalance).toBe(150);

    expect(rows[2].balanceByType).toBe(75);
    expect(rows[2].totalBalance).toBe(125);
  });

  it("表示名が同じでも異なる弾種IDの残数を混在させない", () => {
    const entries = [
      makeEntry({
        id: "e1",
        ammoTypeId: "a1",
        ammoTypeName: "12番 散弾",
        quantity: 100,
      }),
      makeEntry({
        id: "e2",
        ammoTypeId: "a2",
        ammoTypeName: "12番 散弾",
        occurredOn: "2026-01-16",
        quantity: 50,
      }),
    ];

    const rows = buildLedgerBodyRows({ entries });

    expect(rows[0].balanceByType).toBe(100);
    expect(rows[1].balanceByType).toBe(50);
    expect(rows[1].totalBalance).toBe(150);
  });

  it("occurredOn/dayOrder/createdAt/idで時系列ソートする", () => {
    const entries = [
      makeEntry({
        id: "e2",
        category: "consume",
        occurredOn: "2026-01-15",
        quantity: 10,
        dayOrder: 1,
        createdAt: new Date("2026-01-15T01:00:00Z"),
      }),
      makeEntry({
        id: "e1",
        category: "acquire",
        occurredOn: "2026-01-15",
        quantity: 100,
        dayOrder: 0,
        createdAt: new Date("2026-01-15T00:00:00Z"),
      }),
    ];

    const rows = buildLedgerBodyRows({ entries });

    expect(rows[0].entry.id).toBe("e1");
    expect(rows[0].no).toBe(1);
    expect(rows[1].entry.id).toBe("e2");
    expect(rows[1].no).toBe(2);
  });

  it("負数の残弾数も隠さず表示する", () => {
    const entries = [
      makeEntry({
        id: "e1",
        category: "consume",
        occurredOn: "2026-01-15",
        quantity: 50,
        ammoTypeName: "クレー 7.5号",
        createdAt: new Date("2026-01-15T00:00:00Z"),
      }),
    ];

    const rows = buildLedgerBodyRows({ entries });

    expect(rows[0].balanceByType).toBe(-50);
    expect(rows[0].totalBalance).toBe(-50);
  });

  it("空配列に対して空を返す", () => {
    const rows = buildLedgerBodyRows({ entries: [] });
    expect(rows).toHaveLength(0);
  });

  it("同日同dayOrderのidソートでタイブレークする", () => {
    const entries = [
      makeEntry({
        id: "e-b",
        category: "acquire",
        occurredOn: "2026-01-15",
        quantity: 50,
        dayOrder: 0,
        createdAt: new Date("2026-01-15T00:00:00Z"),
      }),
      makeEntry({
        id: "e-a",
        category: "acquire",
        occurredOn: "2026-01-15",
        quantity: 30,
        dayOrder: 0,
        createdAt: new Date("2026-01-15T00:00:00Z"),
      }),
    ];

    const rows = buildLedgerBodyRows({ entries });
    expect(rows[0].entry.id).toBe("e-a");
    expect(rows[1].entry.id).toBe("e-b");
  });
});
