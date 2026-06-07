import { describe, expect, it } from "vitest";
import { buildLedgerDisplayRows, isDisplayRowSelectable } from "./build-ledger-display-rows";

const permit = {
  id: "permit-1",
  userId: "u1",
  ledgerPurpose: "shooting",
  name: "12番",
  permitPurpose: "標的射撃",
  grantedOn: "2026-01-01",
  expiresOn: "2026-12-31",
  quantity: 1200,
  memo: null,
  createdAt: new Date(),
  updatedAt: new Date(),
};

describe("buildLedgerDisplayRows", () => {
  it("許可繰越行を記録より前に並べる", () => {
    const rows = buildLedgerDisplayRows({
      purpose: "shooting",
      permits: [permit],
      permitEvents: [
        {
          id: "pe1",
          userId: "u1",
          permitId: "permit-1",
          purpose: "shooting",
          eventKind: "carryover",
          occurredOn: "2026-01-01",
          quantity: 1200,
          memo: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ],
      entries: [
        {
          id: "e1",
          userId: "u1",
          transactionId: "t1",
          category: "consume",
          purpose: "shooting",
          occurredOn: "2026-03-01",
          ammoTypeId: "ammo-1",
          ammoTypeName: "クレー",
          quantity: 50,
          location: "射撃場",
          counterpartyName: null,
          counterpartyAddress: null,
          gunId: null,
          gunName: null,
          gunNumber: null,
          gunPermitNumber: null,
          voidedAt: null,
          dayOrder: 0,
          createdAt: new Date("2026-03-01T00:00:00.000Z"),
          updatedAt: new Date(),
        },
      ],
    });

    expect(rows).toHaveLength(2);
    expect(rows[0].kind).toBe("permit_carryover");
    if (rows[0].kind === "permit_carryover") {
      expect(rows[0].permitName).toBe("12番");
      expect(rows[0].expiresOn).toBe("2026-12-31");
    }
    expect(rows[1].kind).toBe("entry");
  });

  it("許可残数失効行を帳簿に含める", () => {
    const rows = buildLedgerDisplayRows({
      purpose: "shooting",
      permits: [permit],
      permitEvents: [
        {
          id: "pe-expiry",
          userId: "u1",
          permitId: "permit-1",
          purpose: "shooting",
          eventKind: "expiry",
          occurredOn: "2026-12-31",
          quantity: 0,
          memo: "許可有効期限",
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ],
      entries: [],
    });

    expect(rows).toHaveLength(1);
    expect(rows[0].kind).toBe("permit_expiry");
  });

  it("許可繰越行も選択できる", () => {
    expect(
      isDisplayRowSelectable({
        row: {
          kind: "permit_carryover",
          id: "permit-carryover-pe1",
          occurredOn: "2026-01-01",
          quantity: 1200,
          expiresOn: "2026-12-31",
          permitName: "12番",
          permitPurpose: "標的射撃",
        },
      }),
    ).toBe(true);
  });

  it("印刷期間外の許可繰越は含めない", () => {
    const rows = buildLedgerDisplayRows({
      purpose: "shooting",
      permits: [permit],
      from: "2026-01-01",
      to: "2026-12-31",
      permitEvents: [
        {
          id: "pe1",
          userId: "u1",
          permitId: "permit-1",
          purpose: "shooting",
          eventKind: "carryover",
          occurredOn: "2025-01-01",
          quantity: 800,
          memo: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ],
      entries: [],
    });

    expect(rows).toHaveLength(0);
  });
});
