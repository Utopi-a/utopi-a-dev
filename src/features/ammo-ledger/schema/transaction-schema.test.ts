import { describe, expect, it } from "vitest";
import { transactionInputSchema } from "./transaction-schema";

describe("transactionInputSchema", () => {
  it("射撃消費入力を受け付ける", () => {
    const result = transactionInputSchema.safeParse({
      inputKind: "consume",
      purpose: "shooting",
      occurredOn: "2026-06-07",
      ammoTypeId: "ammo-1",
      gunId: "gun-1",
      rangeId: "range-1",
      boxCount: 3,
      looseRounds: -2,
    });
    expect(result.success).toBe(true);
  });

  it("狩猟消費は location があれば受け付ける", () => {
    const result = transactionInputSchema.safeParse({
      inputKind: "consume",
      purpose: "hunting",
      occurredOn: "2026-06-07",
      ammoTypeId: "ammo-1",
      gunId: "gun-1",
      location: "〇〇狩場",
      boxCount: 1,
      looseRounds: 0,
    });
    expect(result.success).toBe(true);
  });

  it("狩猟用の弾を射撃場で消費できる", () => {
    const result = transactionInputSchema.safeParse({
      inputKind: "consume",
      purpose: "hunting",
      occurredOn: "2026-06-07",
      ammoTypeId: "ammo-1",
      gunId: "gun-1",
      rangeId: "range-1",
      boxCount: 1,
      looseRounds: 0,
    });
    expect(result.success).toBe(true);
  });

  it("狩猟消費で射撃場もその他の場所もなければ拒否する", () => {
    const result = transactionInputSchema.safeParse({
      inputKind: "consume",
      purpose: "hunting",
      occurredOn: "2026-06-07",
      ammoTypeId: "ammo-1",
      gunId: "gun-1",
      boxCount: 1,
      looseRounds: 0,
    });
    expect(result.success).toBe(false);
  });

  it("射撃消費で rangeId がなければ拒否する", () => {
    const result = transactionInputSchema.safeParse({
      inputKind: "consume",
      purpose: "shooting",
      occurredOn: "2026-06-07",
      ammoTypeId: "ammo-1",
      gunId: "gun-1",
      boxCount: 1,
      looseRounds: 0,
    });
    expect(result.success).toBe(false);
  });

  it("射撃用の弾はその他の場所入力を拒否する", () => {
    const result = transactionInputSchema.safeParse({
      inputKind: "consume",
      purpose: "shooting",
      occurredOn: "2026-06-07",
      ammoTypeId: "ammo-1",
      gunId: "gun-1",
      location: "任意の場所",
      boxCount: 1,
      looseRounds: 0,
    });
    expect(result.success).toBe(false);
  });

  it("譲受で相手方が未入力なら拒否する", () => {
    const result = transactionInputSchema.safeParse({
      inputKind: "acquire",
      purpose: "hunting",
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
      purpose: "shooting",
      occurredOn: "2026-06-07",
      ammoTypeId: "ammo-1",
      counterpartyId: "shop-1",
      outerBoxCount: 1,
      boxCount: 0,
      looseRounds: 0,
    });
    expect(result.success).toBe(true);
  });

  it("製造入力を受け付ける", () => {
    const result = transactionInputSchema.safeParse({
      inputKind: "manufacture",
      purpose: "shooting",
      occurredOn: "2026-06-07",
      ammoTypeId: "ammo-1",
      boxCount: 2,
      looseRounds: 0,
      ledgerNote: "自製",
    });
    expect(result.success).toBe(true);
  });

  it("交付で相手方が未入力なら拒否する", () => {
    const result = transactionInputSchema.safeParse({
      inputKind: "issue",
      purpose: "shooting",
      occurredOn: "2026-06-07",
      ammoTypeId: "ammo-1",
      boxCount: 1,
      looseRounds: 0,
    });
    expect(result.success).toBe(false);
  });

  it("被交付で相手方IDがあれば受け付ける", () => {
    const result = transactionInputSchema.safeParse({
      inputKind: "receive",
      purpose: "hunting",
      occurredOn: "2026-06-07",
      ammoTypeId: "ammo-1",
      counterpartyId: "org-1",
      boxCount: 1,
      looseRounds: 0,
    });
    expect(result.success).toBe(true);
  });

  it("不正な日付形式を拒否する", () => {
    const result = transactionInputSchema.safeParse({
      inputKind: "dispose",
      purpose: "shooting",
      occurredOn: "2026/06/07",
      ammoTypeId: "ammo-1",
      boxCount: 1,
      looseRounds: 0,
    });
    expect(result.success).toBe(false);
  });
});
