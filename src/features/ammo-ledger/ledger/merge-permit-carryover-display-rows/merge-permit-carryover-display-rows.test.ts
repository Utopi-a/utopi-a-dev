import { describe, expect, it } from "vitest";
import { mergePermitCarryoverDisplayRows } from "./merge-permit-carryover-display-rows";

describe("mergePermitCarryoverDisplayRows", () => {
  it("同じ許可種別×目的×日付の繰越行を数量合算して1行にまとめる", () => {
    const rows = mergePermitCarryoverDisplayRows({
      rows: [
        {
          kind: "permit_carryover",
          id: "permit-carryover-pe1",
          occurredOn: "2026-01-01",
          quantity: 1200,
          expiresOn: "2026-06-01",
          permitName: "12番",
          permitPurpose: "標的射撃",
        },
        {
          kind: "permit_carryover",
          id: "permit-carryover-pe2",
          occurredOn: "2026-01-01",
          quantity: 800,
          expiresOn: "2026-09-01",
          permitName: "12番",
          permitPurpose: "標的射撃",
        },
      ],
    });

    expect(rows).toHaveLength(1);
    expect(rows[0].quantity).toBe(2000);
    expect(rows[0].permitName).toBe("12番");
    expect(rows[0].permitPurpose).toBe("標的射撃");
    expect(rows[0].expiresOn).toBeNull();
  });

  it("許可種別や目的が異なる繰越行はまとめない", () => {
    const rows = mergePermitCarryoverDisplayRows({
      rows: [
        {
          kind: "permit_carryover",
          id: "permit-carryover-pe1",
          occurredOn: "2026-01-01",
          quantity: 1200,
          expiresOn: "2026-06-01",
          permitName: "12番",
          permitPurpose: "標的射撃",
        },
        {
          kind: "permit_carryover",
          id: "permit-carryover-pe2",
          occurredOn: "2026-01-01",
          quantity: 800,
          expiresOn: "2026-06-01",
          permitName: "10番",
          permitPurpose: "狩猟（鳥獣の捕獲）",
        },
      ],
    });

    expect(rows).toHaveLength(2);
  });

  it("有効期限が同じなら統合後も保持する", () => {
    const rows = mergePermitCarryoverDisplayRows({
      rows: [
        {
          kind: "permit_carryover",
          id: "permit-carryover-pe1",
          occurredOn: "2026-01-01",
          quantity: 500,
          expiresOn: "2026-06-01",
          permitName: "12番",
          permitPurpose: "標的射撃",
        },
        {
          kind: "permit_carryover",
          id: "permit-carryover-pe2",
          occurredOn: "2026-01-01",
          quantity: 300,
          expiresOn: "2026-06-01",
          permitName: "12番",
          permitPurpose: "標的射撃",
        },
      ],
    });

    expect(rows).toHaveLength(1);
    expect(rows[0].quantity).toBe(800);
    expect(rows[0].expiresOn).toBe("2026-06-01");
  });
});
