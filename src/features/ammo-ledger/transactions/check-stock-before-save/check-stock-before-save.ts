import { and, eq, isNull, notInArray } from "drizzle-orm";
import { ammoLedgerEntry } from "@/db/schema/ammo-ledger";
import type { AmmoLedgerMutationTx } from "@/features/ammo-ledger/ledger/lock/acquire-ledger-advisory-lock/acquire-ledger-advisory-lock";
import {
  type PlannedStockChange,
  validateStockTimeline,
} from "@/features/ammo-ledger/ledger/validate-stock-timeline/validate-stock-timeline";
import type { LedgerCategory } from "@/features/ammo-ledger/schema/ledger-category";

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
