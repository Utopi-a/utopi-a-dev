import type { LedgerCategory } from "@/features/ammo-ledger/schema/ledger-category";

type StockEntry = {
  ammoTypeId: string;
  category: LedgerCategory;
  quantity: number;
};

const increaseCategories: LedgerCategory[] = ["acquire", "manufacture"];
const decreaseCategories: LedgerCategory[] = ["consume", "transfer", "dispose"];

export function computeStockByAmmoType({
  entries,
}: {
  entries: StockEntry[];
}): Map<string, number> {
  const stock = new Map<string, number>();

  for (const entry of entries) {
    const current = stock.get(entry.ammoTypeId) ?? 0;
    if (increaseCategories.includes(entry.category)) {
      stock.set(entry.ammoTypeId, current + entry.quantity);
    } else if (decreaseCategories.includes(entry.category)) {
      stock.set(entry.ammoTypeId, current - entry.quantity);
    }
  }

  return stock;
}

export function computeStockDiff({
  bookStock,
  actualStock,
}: {
  bookStock: number;
  actualStock: number;
}): number {
  return actualStock - bookStock;
}
