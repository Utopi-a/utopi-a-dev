import { describe, expect, it } from "vitest";
import { bulkTransactionsInputSchema } from "@/features/ammo-ledger/schema/bulk-transaction-schema";

describe("bulkTransactionsInputSchema", () => {
  it("accepts mixed consume and acquire entries", () => {
    const result = bulkTransactionsInputSchema.safeParse({
      entries: [
        {
          inputKind: "consume",
          purpose: "shooting",
          occurredOn: "2026-06-01",
          gunId: "gun-1",
          rangeId: "range-1",
          ammoTypeId: "ammo-1",
          outerBoxCount: 0,
          boxCount: 1,
          looseRounds: 0,
        },
        {
          inputKind: "acquire",
          purpose: "hunting",
          occurredOn: "2026-06-05",
          counterpartyId: "shop-1",
          ammoTypeId: "ammo-2",
          outerBoxCount: 0,
          boxCount: 2,
          looseRounds: 0,
        },
      ],
    });

    expect(result.success).toBe(true);
  });

  it("rejects empty entries", () => {
    const result = bulkTransactionsInputSchema.safeParse({ entries: [] });
    expect(result.success).toBe(false);
  });
});
