import { describe, expect, it } from "vitest";
import { getOpeningBalance } from "./get-opening-balance";

describe("getOpeningBalance", () => {
  it("指定年の許可繰越と残弾数を取得する", () => {
    const snapshot = getOpeningBalance({
      year: 2026,
      purpose: "shooting",
      permitEvents: [
        {
          id: "pe1",
          userId: "u1",
          permitId: "permit-1",
          purpose: "shooting",
          eventKind: "carryover",
          occurredOn: "2026-01-01",
          quantity: 1500,
          memo: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: "pe2",
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
      permits: [
        {
          id: "permit-1",
          userId: "u1",
          ledgerPurpose: "shooting",
          name: "12番",
          permitPurpose: "標的射撃",
          grantedOn: "2026-01-01",
          expiresOn: "2026-12-31",
          quantity: 1500,
          memo: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ],
      entries: [
        {
          id: "e1",
          userId: "u1",
          transactionId: null,
          category: "carryover",
          purpose: "shooting",
          occurredOn: "2026-01-01",
          ammoTypeId: "ammo-1",
          ammoTypeName: "クレー",
          quantity: 120,
          location: null,
          counterpartyName: null,
          counterpartyAddress: null,
          gunId: null,
          gunName: null,
          gunNumber: null,
          gunPermitNumber: null,
          voidedAt: null,
          dayOrder: 0,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ],
    });

    expect(snapshot.permitCarryovers).toHaveLength(1);
    expect(snapshot.permitCarryovers[0]?.name).toBe("12番");
    expect(snapshot.permitCarryovers[0]?.quantity).toBe(1500);
    expect(snapshot.permitCarryovers[0]?.expiresOn).toBe("2026-12-31");
    expect(snapshot.stockByAmmoType["ammo-1"]).toBe(120);
  });
});
