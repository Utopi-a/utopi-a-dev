import {
  applyStockEntry,
  buildStockKey,
  type StockTimelineEntry,
  sortStockEntries,
} from "@/features/ammo-ledger/ledger/compute-stock/compute-stock";
import { buildYearOpeningDay } from "@/features/ammo-ledger/opening-balance/build-year-day/build-year-day";

/** 用途 → 弾種ID → 前年末の帳簿残数。前年末までに記録のない弾種は含まない。 */
export type PriorYearEndStock = Record<string, Record<string, number>>;

export function computePriorYearEndStock({
  entries,
  year,
}: {
  entries: StockTimelineEntry[];
  year: number;
}): PriorYearEndStock {
  const openingDay = buildYearOpeningDay({ year });
  const stock = new Map<string, number>();
  const stockByPurpose: PriorYearEndStock = {};

  const priorEntries = entries.filter((entry) => entry.occurredOn < openingDay);
  for (const entry of sortStockEntries({ entries: priorEntries })) {
    // 年初繰越は登録済みの弾種ごとに入れるため、削除済み弾種の履歴は数えない。
    if (entry.ammoTypeId === null) continue;
    applyStockEntry({ stock, entry });
    stockByPurpose[entry.purpose] ??= {};
    stockByPurpose[entry.purpose][entry.ammoTypeId] = stock.get(buildStockKey({ entry })) ?? 0;
  }

  return stockByPurpose;
}
