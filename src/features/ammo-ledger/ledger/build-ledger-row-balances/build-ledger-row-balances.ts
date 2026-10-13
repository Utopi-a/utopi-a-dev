import type { ammoLedgerEntry } from "@/db/schema/ammo-ledger";
import { buildLedgerBodyRows } from "@/features/ammo-ledger/documents/build-ledger-body-rows/build-ledger-body-rows";
import { formatAmmoTypeLabel } from "@/features/ammo-ledger/documents/format-ammo-type-label/format-ammo-type-label";
import {
  applyStockEntry,
  buildStockKey,
  sortStockEntries,
} from "@/features/ammo-ledger/ledger/compute-stock/compute-stock";
import type { LedgerCategory } from "@/features/ammo-ledger/schema/ledger-category";

type LedgerEntry = typeof ammoLedgerEntry.$inferSelect;

export type LedgerRowBalance = {
  balanceByType: number;
  totalBalance: number;
};

function toStockEntry({ entry }: { entry: LedgerEntry }) {
  return { ...entry, category: entry.category as LedgerCategory };
}

/**
 * 画面の帳簿行ごとの種類別残と総残数（記録IDごと）。1用途の記録を渡す。
 * 帳票と同じく期間内の記録を印字する実包種類の単位で数え、期間より前の残数を足す。
 * 年初繰越はその弾種の残数を置き換えるため、期間内に繰越のある弾種は前の残数を足さない。
 */
export function buildLedgerRowBalances({
  entries,
  from,
  to,
}: {
  entries: LedgerEntry[];
  from: string;
  to: string;
}): Map<string, LedgerRowBalance> {
  const periodEntries = entries.filter(
    (entry) => entry.occurredOn >= from && entry.occurredOn <= to,
  );
  const carriedOverKeys = new Set(
    periodEntries
      .filter((entry) => entry.category === "carryover")
      .map((entry) => buildStockKey({ entry: toStockEntry({ entry }) })),
  );

  const stockByKey = new Map<string, number>();
  const labelByKey = new Map<string, string>();
  const earlierEntries = entries
    .filter((entry) => entry.occurredOn < from)
    .map((entry) => toStockEntry({ entry }));
  for (const entry of sortStockEntries({ entries: earlierEntries })) {
    applyStockEntry({ stock: stockByKey, entry });
    labelByKey.set(buildStockKey({ entry }), formatAmmoTypeLabel({ snapshot: entry }));
  }

  const openingByLabel = new Map<string, number>();
  let openingTotal = 0;
  for (const [key, stock] of stockByKey) {
    if (carriedOverKeys.has(key)) continue;
    const label = labelByKey.get(key) ?? "";
    openingByLabel.set(label, (openingByLabel.get(label) ?? 0) + stock);
    openingTotal += stock;
  }

  return new Map(
    buildLedgerBodyRows({ entries: periodEntries }).map((row) => [
      row.entry.id,
      {
        balanceByType:
          row.balanceByType +
          (openingByLabel.get(formatAmmoTypeLabel({ snapshot: row.entry })) ?? 0),
        totalBalance: row.totalBalance + openingTotal,
      },
    ]),
  );
}
