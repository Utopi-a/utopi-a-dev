import { describe, expect, it } from "vitest";
import { buildLedgerPrintDisplayRows } from "./build-ledger-print-display-rows";

const permit = {
  id: "permit-1",
  userId: "u1",
  ledgerPurpose: "shooting",
  name: "12番",
  permitPurpose: "標的射撃",
  grantedOn: "2025-06-01",
  expiresOn: "2026-06-01",
  quantity: 5000,
  memo: null,
  createdAt: new Date(),
  updatedAt: new Date(),
};

describe("buildLedgerPrintDisplayRows", () => {
  it("繰越・失効・記録を日付順に並べ、種別は許可の番号だけを出す", () => {
    const rows = buildLedgerPrintDisplayRows({
      permitName: "12番",
      permitPurpose: "標的射撃",
      ledgerPurpose: "shooting",
      from: "2026-01-01",
      to: "2026-12-31",
      permits: [permit],
      permitEvents: [
        {
          id: "pe-carryover",
          userId: "u1",
          permitId: "permit-1",
          purpose: "shooting",
          eventKind: "carryover",
          occurredOn: "2026-01-01",
          quantity: 3200,
          memo: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: "pe-expiry",
          userId: "u1",
          permitId: "permit-1",
          purpose: "shooting",
          eventKind: "expiry",
          occurredOn: "2026-06-01",
          quantity: 0,
          memo: "許可有効期限",
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
          ammoTypeName: "クレー 7.5号",
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

    expect(rows).toHaveLength(3);
    expect(rows[0].kind).toBe("permit_carryover");
    expect(rows[1].kind).toBe("entry");
    expect(rows[2].kind).toBe("permit_expiry");

    if (rows[0].kind === "permit_carryover") {
      expect(rows[0].permitName).toBe("12番");
      expect(rows[0].permitPurpose).toBe("標的射撃");
      expect(rows[0].expiresOn).toBe("2026-06-01");
    }

    if (rows[1].kind === "entry") {
      expect(rows[1].permitName).toBe("12番");
      expect(rows[1].entry.ammoTypeName).toBe("クレー 7.5号");
    }
  });
});
