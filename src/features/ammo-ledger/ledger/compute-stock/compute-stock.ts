import {
  compareLedgerEntries,
  type LedgerEntrySortKey,
} from "@/features/ammo-ledger/ledger/compare-ledger-entries/compare-ledger-entries";
import type { LedgerCategory } from "@/features/ammo-ledger/schema/ledger-category";

export type StockEntry = {
  ammoTypeId: string | null;
  purpose: string;
  category: LedgerCategory;
  quantity: number;
  ammoTypeName?: string;
  ammoCartridgeType?: string | null;
  ammoCaliber?: string | null;
  ammoGaugeNumber?: string | null;
};

export type StockTimelineEntry = StockEntry & LedgerEntrySortKey & { id?: string };

export function buildStockKey({ entry }: { entry: StockEntry }): string {
  return JSON.stringify(
    entry.ammoTypeId !== null
      ? [entry.purpose, "id", entry.ammoTypeId]
      : [
          entry.purpose,
          "snapshot",
          entry.ammoCartridgeType ?? "",
          entry.ammoCaliber ?? "",
          entry.ammoGaugeNumber ?? "",
          entry.ammoTypeName ?? "",
        ],
  );
}

export function sortStockEntries<T extends LedgerEntrySortKey & { id?: string }>({
  entries,
}: {
  entries: T[];
}): T[] {
  return [...entries].sort(
    (a, b) => compareLedgerEntries({ a, b }) || (a.id ?? "").localeCompare(b.id ?? ""),
  );
}

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
}): number {
  const key = buildStockKey({ entry });
  const current = stock.get(key) ?? 0;
  let next: number;

  switch (entry.category) {
    case "acquire":
    case "receive":
    case "manufacture":
      next = current + entry.quantity;
      break;
    case "consume":
    case "transfer":
    case "issue":
    case "dispose":
      next = current - entry.quantity;
      break;
    case "carryover":
      next = entry.quantity;
      break;
    default: {
      const exhaustiveCheck: never = entry.category;
      return exhaustiveCheck;
    }
  }
  stock.set(key, next);
  return next - current;
}

export function computeStockByAmmoType({
  entries,
}: {
  entries: StockTimelineEntry[];
}): Map<string, number> {
  const stockByPurpose = new Map<string, number>();
  const stockByAmmoType = new Map<string, number>();

  for (const entry of sortStockEntries({ entries })) {
    // 削除済み弾種の履歴を、登録済みの弾種で消費できる残数へ充当しない。
    if (entry.ammoTypeId === null) continue;
    const delta = applyStockEntry({ stock: stockByPurpose, entry });
    stockByAmmoType.set(entry.ammoTypeId, (stockByAmmoType.get(entry.ammoTypeId) ?? 0) + delta);
  }

  return stockByAmmoType;
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
