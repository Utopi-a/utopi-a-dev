import type { LedgerCategory } from "@/features/ammo-ledger/schema/ledger-category";

type StockEntry = {
  ammoTypeId: string;
  category: LedgerCategory;
  quantity: number;
};

export function isStockDecreaseCategory({ category }: { category: LedgerCategory }): boolean {
  return (
    category === "consume" ||
    category === "transfer" ||
    category === "issue" ||
    category === "dispose"
  );
}

export function applyStockEntry({
  stock,
  entry,
}: {
  stock: Map<string, number>;
  entry: StockEntry;
}) {
  const current = stock.get(entry.ammoTypeId) ?? 0;

  switch (entry.category) {
    case "acquire":
    case "receive":
    case "manufacture":
      stock.set(entry.ammoTypeId, current + entry.quantity);
      return;
    case "consume":
    case "transfer":
    case "issue":
    case "dispose":
      stock.set(entry.ammoTypeId, current - entry.quantity);
      return;
    case "carryover":
      stock.set(entry.ammoTypeId, entry.quantity);
      return;
    default: {
      const exhaustiveCheck: never = entry.category;
      return exhaustiveCheck;
    }
  }
}

export function computeStockByAmmoType({
  entries,
}: {
  entries: StockEntry[];
}): Map<string, number> {
  const stock = new Map<string, number>();

  for (const entry of entries) {
    applyStockEntry({ stock, entry });
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
