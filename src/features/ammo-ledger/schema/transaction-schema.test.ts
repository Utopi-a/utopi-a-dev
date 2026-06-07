import { describe, expect, it } from "vitest";
import { transactionInputSchema } from "./transaction-schema";

describe("transactionInputSchema", () => {
  it("消費入力を受け付ける", () => {
    const result = transactionInputSchema.safeParse({
      inputKind: "consume",
      occurredOn: "2026-06-07",
      ammoTypeId: "ammo-1",
      gunId: "gun-1",
      rangeId: "range-1",
      boxCount: 3,
      looseRounds: -2,
    });
    expect(result.success).toBe(true);
  });

  it("譲受で相手方が未入力なら拒否する", () => {
    const result = transactionInputSchema.safeParse({
      inputKind: "acquire",
      occurredOn: "2026-06-07",
      ammoTypeId: "ammo-1",
      boxCount: 1,
      looseRounds: 0,
      counterpartyAddress: "東京都",
    });
    expect(result.success).toBe(false);
  });

  it("譲受で購入先IDがあれば受け付ける", () => {
    const result = transactionInputSchema.safeParse({
      inputKind: "acquire",
      occurredOn: "2026-06-07",
      ammoTypeId: "ammo-1",
      counterpartyId: "shop-1",
      outerBoxCount: 1,
      boxCount: 0,
      looseRounds: 0,
    });
    expect(result.success).toBe(true);
  });

  it("不正な日付形式を拒否する", () => {
    const result = transactionInputSchema.safeParse({
      inputKind: "dispose",
      occurredOn: "2026/06/07",
      ammoTypeId: "ammo-1",
      boxCount: 1,
      looseRounds: 0,
    });
    expect(result.success).toBe(false);
  });
});
