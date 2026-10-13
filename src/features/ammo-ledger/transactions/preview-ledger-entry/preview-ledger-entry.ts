import { computeStockByAmmoType } from "@/features/ammo-ledger/ledger/compute-stock/compute-stock";
import type { StockShortage } from "@/features/ammo-ledger/ledger/validate-stock-timeline/validate-stock-timeline";
import type { LedgerCategory } from "@/features/ammo-ledger/schema/ledger-category";
import {
  type LedgerTransactionPayload,
  prepareOptimisticLedgerEntry,
} from "@/features/ammo-ledger/transactions/prepare-optimistic-ledger-entry/prepare-optimistic-ledger-entry";
import type { AmmoLedgerWorkspace } from "@/features/ammo-ledger/workspace/ammo-ledger-workspace-types";

export type LedgerEntryPreview = {
  /** 記録する用途・弾の今の帳簿残数。編集中の記録は除く */
  purposeStock: number;
  /** 保存するとサーバーで拒否される理由。保存できるときは null */
  error: string | null;
  shortage: StockShortage | null;
};

/**
 * 入力中の記録について、用途ごとの残数と、保存前の確認（サーバーと同じ判定）の結果を返す。
 * 在庫は用途ごとに数えるため、全用途の合計では足りていても保存で拒否されることに先に気づけるようにする。
 */
export function previewLedgerEntry({
  workspace,
  payload,
  ledgerEntryId,
  now,
}: {
  workspace: AmmoLedgerWorkspace;
  payload: LedgerTransactionPayload;
  ledgerEntryId?: string;
  now: Date;
}): LedgerEntryPreview {
  const purposeStock =
    computeStockByAmmoType({
      entries: workspace.entries
        .filter((entry) => entry.purpose === payload.purpose && entry.id !== ledgerEntryId)
        .map((entry) => ({ ...entry, category: entry.category as LedgerCategory })),
    }).get(payload.ammoTypeId) ?? 0;
  const prepared = prepareOptimisticLedgerEntry({
    workspace,
    payload,
    ledgerEntryId,
    provisionalId: "preview",
    now,
  });

  return prepared.ok
    ? { purposeStock, error: null, shortage: null }
    : { purposeStock, error: prepared.error, shortage: prepared.shortage ?? null };
}
