import { describe, expect, it } from "vitest";
import {
  buildTestEntry,
  buildTestWorkspace,
} from "@/features/ammo-ledger/workspace/build-test-workspace/build-test-workspace";
import { previewLedgerEntry } from "./preview-ledger-entry";

const now = new Date("2026-10-13T03:00:00Z");

// 射撃用に200発、狩猟用は0発
const workspace = buildTestWorkspace({
  entries: [
    buildTestEntry({
      id: "shooting-carryover",
      category: "carryover",
      occurredOn: "2026-01-01",
      quantity: 200,
    }),
    buildTestEntry({
      id: "shooting-consume",
      category: "consume",
      occurredOn: "2026-05-01",
      quantity: 25,
    }),
  ],
});

const disposePayload = {
  inputKind: "dispose" as const,
  purpose: "shooting" as const,
  occurredOn: "2026-10-01",
  ammoTypeId: "ammo-1",
  boxCount: 1,
  looseRounds: 0,
};

describe("previewLedgerEntry", () => {
  it("選んだ用途の残数を返し、足りていれば保存できる", () => {
    expect(previewLedgerEntry({ workspace, payload: disposePayload, now })).toEqual({
      purposeStock: 175,
      error: null,
      shortage: null,
    });
  });

  it("全用途の合計では足りていても、選んだ用途の在庫が足りなければ理由と不足した日を返す", () => {
    expect(
      previewLedgerEntry({
        workspace,
        payload: { ...disposePayload, purpose: "hunting" },
        now,
      }),
    ).toEqual({
      purposeStock: 0,
      error: "テスト散弾 7.5号の在庫が不足しています（狩猟用、2026/10/01時点で残り0発、出庫25発）",
      shortage: { purpose: "hunting", occurredOn: "2026-10-01" },
    });
  });

  it("編集では元の記録を除いた残数にする", () => {
    expect(
      previewLedgerEntry({
        workspace,
        payload: { ...disposePayload, occurredOn: "2026-05-01" },
        ledgerEntryId: "shooting-consume",
        now,
      }).purposeStock,
    ).toBe(200);
  });
});
