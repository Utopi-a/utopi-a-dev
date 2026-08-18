import { describe, expect, it } from "vitest";
import { buildLedgerBodyRows } from "@/features/ammo-ledger/documents/build-ledger-body-rows/build-ledger-body-rows";
import { mergePrintCarryoverRows } from "./merge-print-carryover-rows";

function makeEntry(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    id: "e1",
    userId: "u1",
    transactionId: "t1",
    category: "carryover",
    purpose: "shooting",
    occurredOn: "2026-01-01",
    ammoTypeId: "a1",
    ammoTypeName: "12番 散弾 9.5号",
    ammoCartridgeType: "shotgun_shot",
    ammoCaliber: "12番",
    ammoGaugeNumber: "9.5号",
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
    createdAt: new Date("2026-01-01T00:00:00Z"),
    updatedAt: new Date("2026-01-01T00:00:00Z"),
    ...overrides,
  } as Parameters<typeof buildLedgerBodyRows>[0]["entries"][number];
}

function mergeFromEntries({
  entries,
}: {
  entries: Parameters<typeof buildLedgerBodyRows>[0]["entries"];
}) {
  return mergePrintCarryoverRows({
    rows: buildLedgerBodyRows({ entries }),
  });
}

describe("mergePrintCarryoverRows", () => {
  it("同じ印刷ラベルの繰越を1行に合算する", () => {
    const rows = mergeFromEntries({
      entries: [
        makeEntry({
          id: "e1",
          ammoTypeId: "a-95",
          ammoGaugeNumber: "9.5号",
          ammoTypeName: "12番 散弾 9.5号",
          quantity: 100,
        }),
        makeEntry({
          id: "e2",
          ammoTypeId: "a-75",
          ammoGaugeNumber: "7.5号",
          ammoTypeName: "12番 散弾 7.5号",
          quantity: 50,
        }),
      ],
    });

    expect(rows).toHaveLength(1);
    expect(rows[0].entry.quantity).toBe(150);
    expect(rows[0].balanceByType).toBe(150);
    expect(rows[0].totalBalance).toBe(150);
    expect(rows[0].flow).toBe("receive");
    expect(rows[0].no).toBe(1);
  });

  it("散弾と単弾は合算しない", () => {
    const rows = mergeFromEntries({
      entries: [
        makeEntry({
          id: "e1",
          ammoTypeId: "a-shot",
          ammoCartridgeType: "shotgun_shot",
          ammoTypeName: "12番 散弾 7.5号",
          quantity: 100,
        }),
        makeEntry({
          id: "e2",
          ammoTypeId: "a-slug",
          ammoCartridgeType: "shotgun_slug",
          ammoGaugeNumber: null,
          ammoTypeName: "12番 単弾",
          quantity: 20,
        }),
      ],
    });

    expect(rows).toHaveLength(2);
    expect(rows[0].entry.quantity).toBe(100);
    expect(rows[1].entry.quantity).toBe(20);
    expect(rows[1].totalBalance).toBe(120);
  });

  it("譲受・消費は合算しない", () => {
    const rows = mergeFromEntries({
      entries: [
        makeEntry({
          id: "e1",
          category: "acquire",
          occurredOn: "2026-01-15",
          ammoTypeId: "a-95",
          ammoGaugeNumber: "9.5号",
          quantity: 100,
        }),
        makeEntry({
          id: "e2",
          category: "acquire",
          occurredOn: "2026-01-16",
          ammoTypeId: "a-75",
          ammoGaugeNumber: "7.5号",
          ammoTypeName: "12番 散弾 7.5号",
          quantity: 50,
        }),
      ],
    });

    expect(rows).toHaveLength(2);
    expect(rows[0].balanceByType).toBe(100);
    expect(rows[1].balanceByType).toBe(50);
    expect(rows[1].totalBalance).toBe(150);
  });

  it("間に別ラベルの繰越があっても同じ印刷ラベルは合算する", () => {
    const rows = mergeFromEntries({
      entries: [
        makeEntry({
          id: "e1",
          ammoTypeId: "a-95",
          ammoGaugeNumber: "9.5号",
          quantity: 100,
        }),
        makeEntry({
          id: "e2",
          ammoTypeId: "a-slug",
          ammoCartridgeType: "shotgun_slug",
          ammoGaugeNumber: null,
          ammoTypeName: "12番 単弾",
          quantity: 20,
        }),
        makeEntry({
          id: "e3",
          ammoTypeId: "a-75",
          ammoGaugeNumber: "7.5号",
          ammoTypeName: "12番 散弾 7.5号",
          quantity: 50,
        }),
      ],
    });

    expect(rows).toHaveLength(2);
    expect(rows[0].entry.quantity).toBe(150);
    expect(rows[0].balanceByType).toBe(150);
    expect(rows[0].totalBalance).toBe(150);
    expect(rows[1].entry.ammoCartridgeType).toBe("shotgun_slug");
    expect(rows[1].entry.quantity).toBe(20);
    expect(rows[1].totalBalance).toBe(170);
    expect(rows[1].no).toBe(2);
  });
});
