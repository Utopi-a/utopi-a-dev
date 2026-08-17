import { and, asc, eq, isNull, notInArray } from "drizzle-orm";
import { ammoLedgerEntry } from "@/db/schema/ammo-ledger";
import {
  applyStockEntry,
  isStockDecreaseCategory,
} from "@/features/ammo-ledger/ledger/compute-stock/compute-stock";
import type { AmmoLedgerMutationTx } from "@/features/ammo-ledger/ledger/lock/acquire-ledger-advisory-lock/acquire-ledger-advisory-lock";
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

function buildStockKey({ purpose, ammoTypeId }: { purpose: string; ammoTypeId: string }): string {
  return `${purpose}\0${ammoTypeId}`;
}

export function validateStockTimeline({
  entries,
}: {
  entries: PlannedStockChange[];
}): { ok: true } | { ok: false; error: string } {
  const remainingStock = new Map<string, number>();
  const sortedEntries = entries
    .map((entry, sequence) => ({ entry, sequence }))
    .sort((a, b) => {
      const dateCompare = a.entry.occurredOn.localeCompare(b.entry.occurredOn);
      if (dateCompare !== 0) return dateCompare;
      const dayOrderCompare = a.entry.dayOrder - b.entry.dayOrder;
      if (dayOrderCompare !== 0) return dayOrderCompare;
      const createdAtCompare = a.entry.createdAt.getTime() - b.entry.createdAt.getTime();
      if (createdAtCompare !== 0) return createdAtCompare;
      const idCompare = a.entry.id.localeCompare(b.entry.id);
      if (idCompare !== 0) return idCompare;
      return a.sequence - b.sequence;
    });

  for (const { entry } of sortedEntries) {
    const stockKey = buildStockKey({
      purpose: entry.purpose,
      ammoTypeId: entry.ammoTypeId,
    });
    const currentStock = remainingStock.get(stockKey) ?? 0;
    if (isStockDecreaseCategory({ category: entry.category }) && currentStock < entry.quantity) {
      return {
        ok: false,
        error: `${entry.ammoTypeName}の在庫が不足しています（残り${currentStock}発、出庫${entry.quantity}発）`,
      };
    }

    applyStockEntry({
      stock: remainingStock,
      entry: {
        ammoTypeId: stockKey,
        category: entry.category,
        quantity: entry.quantity,
      },
    });
  }

  return { ok: true };
}

export async function checkStockBeforeSave({
  tx,
  userId,
  changes,
  excludedLedgerEntryIds = [],
}: {
  tx: AmmoLedgerMutationTx;
  userId: string;
  changes: PlannedStockChange[];
  excludedLedgerEntryIds?: string[];
}): Promise<{ ok: true } | { ok: false; error: string }> {
  const rows = await tx
    .select({
      id: ammoLedgerEntry.id,
      ammoTypeId: ammoLedgerEntry.ammoTypeId,
      ammoTypeName: ammoLedgerEntry.ammoTypeName,
      purpose: ammoLedgerEntry.purpose,
      category: ammoLedgerEntry.category,
      quantity: ammoLedgerEntry.quantity,
      occurredOn: ammoLedgerEntry.occurredOn,
      dayOrder: ammoLedgerEntry.dayOrder,
      createdAt: ammoLedgerEntry.createdAt,
    })
    .from(ammoLedgerEntry)
    .where(
      and(
        eq(ammoLedgerEntry.userId, userId),
        isNull(ammoLedgerEntry.voidedAt),
        excludedLedgerEntryIds.length > 0
          ? notInArray(ammoLedgerEntry.id, excludedLedgerEntryIds)
          : undefined,
      ),
    )
    .orderBy(
      asc(ammoLedgerEntry.occurredOn),
      asc(ammoLedgerEntry.dayOrder),
      asc(ammoLedgerEntry.createdAt),
    );

  return validateStockTimeline({
    entries: [
      ...rows.flatMap((row) =>
        row.ammoTypeId
          ? [
              {
                id: row.id,
                ammoTypeId: row.ammoTypeId,
                ammoTypeName: row.ammoTypeName,
                purpose: row.purpose,
                category: row.category as LedgerCategory,
                quantity: row.quantity,
                occurredOn: row.occurredOn,
                dayOrder: row.dayOrder,
                createdAt: row.createdAt,
              },
            ]
          : [],
      ),
      ...changes,
    ],
  });
}
