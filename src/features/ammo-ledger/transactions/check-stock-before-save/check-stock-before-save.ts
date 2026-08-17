import { and, asc, eq, isNull, ne } from "drizzle-orm";
import { ammoLedgerEntry } from "@/db/schema/ammo-ledger";
import {
  applyStockEntry,
  computeStockByAmmoType,
  isStockDecreaseCategory,
} from "@/features/ammo-ledger/ledger/compute-stock/compute-stock";
import type { AmmoLedgerMutationTx } from "@/features/ammo-ledger/ledger/lock/acquire-ledger-advisory-lock/acquire-ledger-advisory-lock";
import type { LedgerCategory } from "@/features/ammo-ledger/schema/ledger-category";

export type PlannedStockChange = {
  ammoTypeId: string;
  ammoTypeName: string;
  category: LedgerCategory;
  quantity: number;
};

export function validateStockChanges({
  stockByAmmoType,
  changes,
}: {
  stockByAmmoType: Map<string, number>;
  changes: PlannedStockChange[];
}): { ok: true } | { ok: false; error: string } {
  const remainingStock = new Map(stockByAmmoType);

  for (const change of changes) {
    const currentStock = remainingStock.get(change.ammoTypeId) ?? 0;
    if (isStockDecreaseCategory({ category: change.category }) && currentStock < change.quantity) {
      return {
        ok: false,
        error: `${change.ammoTypeName}の在庫が不足しています（残り${currentStock}発、出庫${change.quantity}発）`,
      };
    }

    applyStockEntry({ stock: remainingStock, entry: change });
  }

  return { ok: true };
}

export async function checkStockBeforeSave({
  tx,
  userId,
  changes,
  excludedLedgerEntryId,
}: {
  tx: AmmoLedgerMutationTx;
  userId: string;
  changes: PlannedStockChange[];
  excludedLedgerEntryId?: string;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  const rows = await tx
    .select({
      ammoTypeId: ammoLedgerEntry.ammoTypeId,
      category: ammoLedgerEntry.category,
      quantity: ammoLedgerEntry.quantity,
    })
    .from(ammoLedgerEntry)
    .where(
      and(
        eq(ammoLedgerEntry.userId, userId),
        isNull(ammoLedgerEntry.voidedAt),
        excludedLedgerEntryId ? ne(ammoLedgerEntry.id, excludedLedgerEntryId) : undefined,
      ),
    )
    .orderBy(
      asc(ammoLedgerEntry.occurredOn),
      asc(ammoLedgerEntry.dayOrder),
      asc(ammoLedgerEntry.createdAt),
    );

  const stockByAmmoType = computeStockByAmmoType({
    entries: rows.flatMap((row) =>
      row.ammoTypeId
        ? [
            {
              ammoTypeId: row.ammoTypeId,
              category: row.category as LedgerCategory,
              quantity: row.quantity,
            },
          ]
        : [],
    ),
  });

  return validateStockChanges({ stockByAmmoType, changes });
}
