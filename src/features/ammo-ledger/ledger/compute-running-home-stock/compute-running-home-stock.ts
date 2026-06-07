import { homeStorageRoundLimit } from "@/features/ammo-ledger/schema/home-storage-limit";
import type { LedgerCategory } from "@/features/ammo-ledger/schema/ledger-category";

type HomeStockEntry = {
  id: string;
  occurredOn: string;
  category: LedgerCategory;
  quantity: number;
};

const increaseCategories: LedgerCategory[] = ["acquire", "manufacture", "carryover"];
const decreaseCategories: LedgerCategory[] = ["consume", "transfer", "dispose"];

function compareDate({ a, b }: { a: string; b: string }): number {
  return a.localeCompare(b);
}

export function computeRunningHomeStock({
  entries,
}: {
  entries: HomeStockEntry[];
}): Map<string, number> {
  const stockByEntryId = new Map<string, number>();
  let total = 0;

  const sorted = [...entries].sort((a, b) => compareDate({ a: a.occurredOn, b: b.occurredOn }));

  for (const entry of sorted) {
    if (increaseCategories.includes(entry.category)) {
      total += entry.quantity;
    } else if (decreaseCategories.includes(entry.category)) {
      total -= entry.quantity;
    }
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
  const stocks = [...runningStock.values()];
  const currentStock = stocks.at(-1) ?? 0;
  const peakStock = stocks.length > 0 ? Math.max(...stocks) : 0;
  const exceededEntryIds = [...runningStock.entries()]
    .filter(([, stock]) => stock > limit)
    .map(([id]) => id);

  return {
    currentStock,
    peakStock,
    limit,
    isCurrentlyExceeded: currentStock > limit,
    hasExceededBefore: peakStock > limit,
    exceededEntryIds,
  };
}
