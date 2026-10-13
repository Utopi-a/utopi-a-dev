import {
  applyStockEntry,
  buildStockKey,
  isStockDecreaseCategory,
  sortStockEntries,
} from "@/features/ammo-ledger/ledger/compute-stock/compute-stock";
import type { LedgerCategory } from "@/features/ammo-ledger/schema/ledger-category";
import { ledgerPurposeLabels } from "@/features/ammo-ledger/schema/ledger-purpose";
import { parseLedgerPurpose } from "@/features/ammo-ledger/schema/resolve-default-purpose";
import { formatIsoDateForDisplay } from "@/lib/date/format-iso-date-for-display";

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

/** 在庫が足りなくなった用途と日付。年初繰越の確認先を示すのに使う */
export type StockShortage = {
  purpose: string;
  occurredOn: string;
};

/** 保存前検証と画面の事前確認で、同じ時系列の在庫判定を使う。 */
export function validateStockTimeline({
  entries,
}: {
  entries: PlannedStockChange[];
}): { ok: true } | { ok: false; error: string; shortage: StockShortage } {
  const remainingStock = new Map<string, number>();
  for (const entry of sortStockEntries({ entries })) {
    const stockKey = buildStockKey({ entry });
    const currentStock = remainingStock.get(stockKey) ?? 0;
    if (isStockDecreaseCategory({ category: entry.category }) && currentStock < entry.quantity) {
      // 在庫は用途ごとに数えるため、どの用途のいつの時点で足りないかを示す。
      const purpose = parseLedgerPurpose({ value: entry.purpose });
      const purposeLabel = purpose ? ledgerPurposeLabels[purpose] : entry.purpose;
      const date = formatIsoDateForDisplay({ value: entry.occurredOn });
      return {
        ok: false,
        error: `${entry.ammoTypeName}の在庫が不足しています（${purposeLabel}、${date}時点で残り${currentStock}発、出庫${entry.quantity}発）`,
        shortage: { purpose: entry.purpose, occurredOn: entry.occurredOn },
      };
    }

    applyStockEntry({
      stock: remainingStock,
      entry,
    });
  }

  return { ok: true };
}
