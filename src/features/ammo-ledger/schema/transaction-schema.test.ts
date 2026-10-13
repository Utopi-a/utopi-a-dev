import { afterEach, describe, expect, it, vi } from "vitest";
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

  describe("未来の日付", () => {
    afterEach(() => {
      vi.useRealTimers();
    });

    function parseDispose({ occurredOn }: { occurredOn: string }) {
      return transactionInputSchema.safeParse({
        inputKind: "dispose",
        purpose: "shooting",
        occurredOn,
        ammoTypeId: "ammo-1",
        boxCount: 1,
        looseRounds: 0,
      });
    }

    it("日本時間の0〜9時（UTC では前日）でも、日本時間の今日の記録を受け付ける", () => {
      vi.useFakeTimers({ toFake: ["Date"] });
      vi.setSystemTime(new Date("2026-10-12T15:30:00Z"));

      expect(parseDispose({ occurredOn: "2026-10-13" }).success).toBe(true);
      expect(parseDispose({ occurredOn: "2026-10-14" }).success).toBe(false);
    });

    it("日本時間の23時台（UTC では同日）でも、翌日の記録は拒否する", () => {
      vi.useFakeTimers({ toFake: ["Date"] });
      vi.setSystemTime(new Date("2026-10-13T14:59:59Z"));

      expect(parseDispose({ occurredOn: "2026-10-13" }).success).toBe(true);
      const tomorrow = parseDispose({ occurredOn: "2026-10-14" });
      expect(tomorrow.success).toBe(false);
      expect(tomorrow.error?.issues.map((issue) => issue.message)).toContain(
        "未来の日付は記録できません",
      );
    });
  });
});
