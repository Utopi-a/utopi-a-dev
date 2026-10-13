import {
  applyStockEntry,
  buildStockKey,
  isStockDecreaseCategory,
  sortStockEntries,
} from "@/features/ammo-ledger/ledger/compute-stock/compute-stock";
import type { LedgerCategory } from "@/features/ammo-ledger/schema/ledger-category";

export type PlannedStockChange = {
  id: string;
  ammoTypeId: string;
  ammoTypeName: string;
  purpose: string;
  category: LedgerCategory;
  quantity: number;
  occurredOn: string;
  dayOrder: number;
  createdAt: Date;
};

/** 保存前検証と画面の事前確認で、同じ時系列の在庫判定を使う。 */
export function validateStockTimeline({
  entries,
}: {
  entries: PlannedStockChange[];
}): { ok: true } | { ok: false; error: string } {
  const remainingStock = new Map<string, number>();
  for (const entry of sortStockEntries({ entries })) {
    const stockKey = buildStockKey({ entry });
    const currentStock = remainingStock.get(stockKey) ?? 0;
    if (isStockDecreaseCategory({ category: entry.category }) && currentStock < entry.quantity) {
      return {
        ok: false,
        error: `${entry.ammoTypeName}の在庫が不足しています（残り${currentStock}発、出庫${entry.quantity}発）`,
      };
    }

    applyStockEntry({
      stock: remainingStock,
      entry,
    });
  }

  return { ok: true };
}
