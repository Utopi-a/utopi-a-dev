import { describe, expect, it } from "vitest";
import {
  buildTestEntry,
  buildTestWorkspace,
} from "@/features/ammo-ledger/workspace/build-test-workspace/build-test-workspace";
import {
  type LedgerTransactionPayload,
  prepareOptimisticLedgerEntry,
} from "./prepare-optimistic-ledger-entry";

const now = new Date("2026-10-13T03:00:00Z");

const consumePayload: LedgerTransactionPayload = {
  inputKind: "consume",
  purpose: "shooting",
  occurredOn: "2026-10-13",
  ammoTypeId: "ammo-1",
  gunId: "gun-1",
  rangeId: "range-1",
  outerBoxCount: 0,
  boxCount: 2,
  looseRounds: 0,
};

const stockedWorkspace = buildTestWorkspace({
  entries: [
    buildTestEntry({
      id: "carryover",
      category: "carryover",
      occurredOn: "2026-01-01",
      quantity: 100,
    }),
    buildTestEntry({
      id: "same-day",
      category: "consume",
      occurredOn: "2026-10-13",
      quantity: 10,
      dayOrder: 3,
    }),
  ],
});

describe("prepareOptimisticLedgerEntry", () => {
  it("新規の消費を、射撃場・銃・弾種の帳簿表記と同日の末尾の並び順で組み立てる", () => {
    const result = prepareOptimisticLedgerEntry({
      workspace: stockedWorkspace,
      payload: consumePayload,
      display: { rangeName: "テスト射撃場", rangeAddress: "千葉県" },
      provisionalId: "pending-1",
      now,
    });

    expect(result).toEqual({
      ok: true,
      entry: expect.objectContaining({
        id: "pending-1",
        category: "consume",
        quantity: 50,
        location: "テスト射撃場 千葉県",
        gunName: "テスト銃",
        gunNumber: "G-1",
        gunPermitNumber: "P-1",
        ammoTypeName: "テスト散弾 7.5号",
        dayOrder: 4,
        createdAt: now,
      }),
    });
  });

  it("サーバーと同じ文言で在庫不足を拒否する", () => {
    const result = prepareOptimisticLedgerEntry({
      workspace: stockedWorkspace,
      payload: { ...consumePayload, boxCount: 4 },
      provisionalId: "pending-1",
      now,
    });

    expect(result).toEqual({
      ok: false,
      error: "テスト散弾 7.5号の在庫が不足しています（残り90発、出庫100発）",
    });
  });

  it("ロック済みの日付は先行表示せずに拒否する", () => {
    const result = prepareOptimisticLedgerEntry({
      workspace: {
        ...stockedWorkspace,
        lockState: { isLocked: true, lockedThrough: "2026-12-31" },
      },
      payload: consumePayload,
      provisionalId: "pending-1",
      now,
    });

    expect(result).toEqual({ ok: false, error: "2026年12月31日までの帳簿はロックされています" });
  });

  it("譲受日に有効な許可がない譲受を拒否する", () => {
    const result = prepareOptimisticLedgerEntry({
      workspace: stockedWorkspace,
      payload: {
        inputKind: "acquire",
        purpose: "shooting",
        occurredOn: "2026-10-13",
        ammoTypeId: "ammo-1",
        boxCount: 1,
        looseRounds: 0,
        counterpartyName: "テスト銃砲店",
        counterpartyAddress: "東京都",
      },
      provisionalId: "pending-1",
      now,
    });

    expect(result).toEqual({ ok: false, error: "譲受日に有効な射撃用の譲受許可がありません" });
  });

  it("編集では元の行を除いて在庫を判定し、ID・並び順・作成日時を引き継ぐ", () => {
    const original = buildTestEntry({
      id: "edited",
      category: "consume",
      occurredOn: "2026-05-01",
      quantity: 90,
      dayOrder: 2,
    });
    const workspace = buildTestWorkspace({
      entries: [
        buildTestEntry({
          id: "carryover",
          category: "carryover",
          occurredOn: "2026-01-01",
          quantity: 100,
        }),
        original,
      ],
    });

    const result = prepareOptimisticLedgerEntry({
      workspace,
      payload: { ...consumePayload, occurredOn: "2026-05-01", boxCount: 4 },
      ledgerEntryId: "edited",
      provisionalId: "pending-unused",
      now,
    });

    expect(result).toEqual({
      ok: true,
      entry: expect.objectContaining({
        id: "edited",
        quantity: 100,
        dayOrder: 2,
        createdAt: original.createdAt,
      }),
    });
  });
});
