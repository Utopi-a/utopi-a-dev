import { describe, expect, it } from "vitest";
import { computePermitUsage } from "./compute-permit-usage";

const today = "2026-10-13";

function acquire({ occurredOn, quantity }: { occurredOn: string; quantity: number }) {
  return { occurredOn, category: "acquire" as const, quantity };
}

describe("computePermitUsage", () => {
  it("譲受は有効期限の早い許可から割り当て、数量を超えた分は次の許可に回す", () => {
    const permits = [
      { id: "later", grantedOn: "2026-06-01", expiresOn: "2027-05-31", quantity: 500 },
      { id: "sooner", grantedOn: "2026-01-01", expiresOn: "2026-12-31", quantity: 100 },
    ];

    const usage = computePermitUsage({
      permits,
      ledgerEntries: [acquire({ occurredOn: "2026-07-01", quantity: 150 })],
      today,
    });

    expect(usage.get("sooner")).toBe(100);
    expect(usage.get("later")).toBe(50);
  });

  it("譲受日に有効でない許可には割り当てない", () => {
    const permits = [
      { id: "expired", grantedOn: "2025-01-01", expiresOn: "2025-12-31", quantity: 100 },
      { id: "upcoming", grantedOn: "2026-11-01", expiresOn: "2027-10-31", quantity: 100 },
    ];

    const usage = computePermitUsage({
      permits,
      ledgerEntries: [acquire({ occurredOn: "2026-03-01", quantity: 30 })],
      today,
    });

    expect(usage.size).toBe(0);
  });

  it("有効期限の当日の譲受は、その許可に割り当てる", () => {
    const permits = [
      { id: "expiring", grantedOn: "2025-10-14", expiresOn: today, quantity: 100 },
      { id: "next", grantedOn: today, expiresOn: "2027-10-12", quantity: 100 },
    ];

    const usage = computePermitUsage({
      permits,
      ledgerEntries: [acquire({ occurredOn: today, quantity: 40 })],
      today,
    });

    expect(usage.get("expiring")).toBe(40);
    expect(usage.get("next")).toBeUndefined();
  });

  it("今日より後の日付の譲受と、譲受以外の記録は数えない", () => {
    const permits = [
      { id: "active", grantedOn: "2026-01-01", expiresOn: "2026-12-31", quantity: 100 },
    ];

    const usage = computePermitUsage({
      permits,
      ledgerEntries: [
        acquire({ occurredOn: "2026-10-20", quantity: 60 }),
        { occurredOn: "2026-05-01", category: "consume" as const, quantity: 20 },
      ],
      today,
    });

    expect(usage.get("active")).toBeUndefined();
  });
});
