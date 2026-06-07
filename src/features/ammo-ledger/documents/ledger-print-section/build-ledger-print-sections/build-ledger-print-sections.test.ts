import { describe, expect, it } from "vitest";
import { buildLedgerPrintSections } from "./build-ledger-print-sections";

describe("buildLedgerPrintSections", () => {
  it("許可種別×目的ごとに帳簿セクションを分ける", () => {
    const sections = buildLedgerPrintSections({
      from: "2026-01-01",
      to: "2026-12-31",
      permits: [
        {
          id: "permit-12",
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
        },
        {
          id: "permit-10",
          userId: "u1",
          ledgerPurpose: "hunting",
          name: "10番",
          permitPurpose: "狩猟（鳥獣の捕獲）",
          grantedOn: "2025-09-01",
          expiresOn: "2026-09-01",
          quantity: 3000,
          memo: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ],
      ammoTypes: [
        {
          id: "ammo-12",
          userId: "u1",
          name: "クレー 7.5号",
          caliber: "12番",
          shotType: "shot",
          gaugeNumber: "7.5",
          roundsPerBox: 25,
          defaultPurpose: "shooting",
          memo: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: "ammo-10",
          userId: "u1",
          name: "鹿用 5号",
          caliber: "10番",
          shotType: "shot",
          gaugeNumber: "5",
          roundsPerBox: 10,
          defaultPurpose: "hunting",
          memo: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ],
      permitEvents: [],
      entries: [
        {
          id: "e-shooting",
          userId: "u1",
          transactionId: "t1",
          category: "consume",
          purpose: "shooting",
          occurredOn: "2026-03-01",
          ammoTypeId: "ammo-12",
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
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: "e-hunting",
          userId: "u1",
          transactionId: "t2",
          category: "consume",
          purpose: "hunting",
          occurredOn: "2026-04-01",
          ammoTypeId: "ammo-10",
          ammoTypeName: "鹿用 5号",
          quantity: 10,
          location: "狩猟場",
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

    expect(sections).toHaveLength(2);

    const shootingSection = sections.find((section) => section.permitName === "12番");
    const huntingSection = sections.find((section) => section.permitName === "10番");

    expect(shootingSection?.permitPurpose).toBe("標的射撃");
    expect(shootingSection?.entries).toHaveLength(1);
    expect(huntingSection?.entries).toHaveLength(1);
  });
});
