import { describe, expect, it } from "vitest";
import { buildTestEntry } from "@/features/ammo-ledger/workspace/build-test-workspace/build-test-workspace";
import { buildLedgerRowBalances } from "./build-ledger-row-balances";

const year2026 = { from: "2026-01-01", to: "2026-12-31" };

const ammo9 = {
  ammoTypeId: "ammo-9",
  ammoTypeName: "テスト散弾 9号",
  ammoGaugeNumber: "9",
};

describe("buildLedgerRowBalances", () => {
  it("年初繰越のある年は繰越から数え、前年の残数を重ねない", () => {
    const balances = buildLedgerRowBalances({
      ...year2026,
      entries: [
        buildTestEntry({
          id: "c-2025",
          category: "carryover",
          occurredOn: "2025-01-01",
          quantity: 100,
        }),
        buildTestEntry({
          id: "u-2025",
          category: "consume",
          occurredOn: "2025-06-01",
          quantity: 10,
        }),
        buildTestEntry({
          id: "c-2026",
          category: "carryover",
          occurredOn: "2026-01-01",
          quantity: 90,
        }),
        buildTestEntry({
          id: "u-2026",
          category: "consume",
          occurredOn: "2026-03-01",
          quantity: 25,
        }),
      ],
    });

    expect([...balances]).toEqual([
      ["c-2026", { balanceByType: 90, totalBalance: 90 }],
      ["u-2026", { balanceByType: 65, totalBalance: 65 }],
    ]);
  });

  it("年初繰越のない年は前年末の残数から続ける", () => {
    const balances = buildLedgerRowBalances({
      ...year2026,
      entries: [
        buildTestEntry({
          id: "c-2025",
          category: "carryover",
          occurredOn: "2025-01-01",
          quantity: 100,
        }),
        buildTestEntry({
          id: "u-2025",
          category: "consume",
          occurredOn: "2025-06-01",
          quantity: 10,
        }),
        buildTestEntry({
          id: "u-2026",
          category: "consume",
          occurredOn: "2026-03-01",
          quantity: 25,
        }),
      ],
    });

    expect(balances.get("u-2026")).toEqual({ balanceByType: 65, totalBalance: 65 });
  });

  it("種類別残は号数違いをまとめた実包種類で数え、繰越のない弾種だけ前年から引き継ぐ", () => {
    const balances = buildLedgerRowBalances({
      ...year2026,
      entries: [
        buildTestEntry({
          id: "a-7.5",
          category: "acquire",
          occurredOn: "2025-02-01",
          quantity: 100,
        }),
        buildTestEntry({
          id: "a-9",
          category: "acquire",
          occurredOn: "2025-02-01",
          quantity: 50,
          ...ammo9,
        }),
        buildTestEntry({
          id: "c-7.5",
          category: "carryover",
          occurredOn: "2026-01-01",
          quantity: 80,
        }),
        buildTestEntry({
          id: "u-9",
          category: "consume",
          occurredOn: "2026-02-01",
          quantity: 5,
          ...ammo9,
        }),
      ],
    });

    // 9号は繰越がないため前年末の50を引き継ぎ、7.5号は繰越の80から数える。
    expect(balances.get("c-7.5")).toEqual({ balanceByType: 130, totalBalance: 130 });
    expect(balances.get("u-9")).toEqual({ balanceByType: 125, totalBalance: 125 });
  });
});
