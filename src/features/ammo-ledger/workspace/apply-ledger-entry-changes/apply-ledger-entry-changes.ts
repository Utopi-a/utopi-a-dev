import type { ammoLedgerEntry } from "@/db/schema/ammo-ledger";
import { compareLedgerEntries } from "@/features/ammo-ledger/ledger/compare-ledger-entries/compare-ledger-entries";
import type { AmmoLedgerWorkspace } from "@/features/ammo-ledger/workspace/ammo-ledger-workspace-types";
import { computeInventoryItems } from "@/features/ammo-ledger/workspace/compute-inventory-items/compute-inventory-items";

export type LedgerEntryRow = typeof ammoLedgerEntry.$inferSelect;

export type LedgerEntryChanges = {
  upserted: LedgerEntryRow[];
  removedIds: string[];
  /** 並び替え。行の内容は変えず、同日内の順番だけを更新する */
  dayOrders?: { id: string; dayOrder: number }[];
};

/**
 * 帳簿行の追加・置換・取消を workspace に反映し、残数を再計算する。
 * 保存中の楽観表示と、保存完了後のキャッシュ更新で同じ計算を使う。
 */
export function applyLedgerEntryChanges({
  workspace,
  changes,
}: {
  workspace: AmmoLedgerWorkspace;
  changes: LedgerEntryChanges;
}): AmmoLedgerWorkspace {
  const dayOrders = new Map(changes.dayOrders?.map(({ id, dayOrder }) => [id, dayOrder]));
  if (changes.upserted.length === 0 && changes.removedIds.length === 0 && dayOrders.size === 0) {
    return workspace;
  }

  const replacedIds = new Set([
    ...changes.removedIds,
    ...changes.upserted.map((entry) => entry.id),
  ]);
  const entries = [
    ...workspace.entries.filter((entry) => !replacedIds.has(entry.id)),
    ...changes.upserted,
  ]
    .map((entry) => {
      const dayOrder = dayOrders.get(entry.id);
      return dayOrder === undefined ? entry : { ...entry, dayOrder };
    })
    .sort((a, b) => compareLedgerEntries({ a, b }));

  return {
    ...workspace,
    entries,
    inventoryItems: computeInventoryItems({
      entries,
      ammoTypes: workspace.inventoryItems.map((item) => item.ammoType),
    }),
  };
}
