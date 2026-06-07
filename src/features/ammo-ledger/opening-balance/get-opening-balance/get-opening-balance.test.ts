import { describe, expect, it } from "vitest";
import { getOpeningBalance } from "./get-opening-balance";

describe("getOpeningBalance", () => {
  it("指定年の繰越残数を取得する", () => {
    const snapshot = getOpeningBalance({
      year: 2026,
      purpose: "shooting",
      permitEvents: [
        {
          id: "pe1",
          userId: "u1",
          permitId: null,
          purpose: "shooting",
          eventKind: "carryover",
          occurredOn: "2026-01-01",
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
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ],
    });

    expect(snapshot.permitBalance).toBe(1500);
    expect(snapshot.stockByAmmoType["ammo-1"]).toBe(120);
  });
});
