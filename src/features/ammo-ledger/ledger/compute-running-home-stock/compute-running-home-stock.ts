import {
  applyStockEntry,
  type StockTimelineEntry,
  sortStockEntries,
} from "@/features/ammo-ledger/ledger/compute-stock/compute-stock";
import { homeStorageRoundLimit } from "@/features/ammo-ledger/schema/home-storage-limit";

type HomeStockEntry = StockTimelineEntry & { id: string };

export function computeRunningHomeStock({
  entries,
}: {
  entries: HomeStockEntry[];
}): Map<string, number> {
  const stockByEntryId = new Map<string, number>();
  const stockByPurpose = new Map<string, number>();
  let total = 0;

  for (const entry of sortStockEntries({ entries })) {
    total += applyStockEntry({ stock: stockByPurpose, entry });
    stockByEntryId.set(entry.id, total);
  }

  return stockByEntryId;
}

export function evaluateHomeStorageLimit({
  entries,
  limit = homeStorageRoundLimit,
}: {
  entries: HomeStockEntry[];
  limit?: number;
}) {
  const runningStock = computeRunningHomeStock({ entries });
  let currentStock = 0;
  let peakStock = runningStock.size === 0 ? 0 : Number.NEGATIVE_INFINITY;
  const exceededEntryIds: string[] = [];
  for (const [id, stock] of runningStock) {
    currentStock = stock;
    peakStock = Math.max(peakStock, stock);
    if (stock > limit) exceededEntryIds.push(id);
  }

  return {
    currentStock,
    peakStock,
    limit,
    isCurrentlyExceeded: currentStock > limit,
    hasExceededBefore: peakStock > limit,
    exceededEntryIds,
  };
}
