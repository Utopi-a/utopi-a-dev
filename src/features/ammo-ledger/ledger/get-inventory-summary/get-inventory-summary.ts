import { and, eq, isNull, ne } from "drizzle-orm";
import { db } from "@/db";
import { ammoLedgerEntry, ammoType } from "@/db/schema/ammo-ledger";
import { computeInventoryItems } from "@/features/ammo-ledger/workspace/compute-inventory-items/compute-inventory-items";

export async function getInventorySummary({
  userId,
  excludedLedgerEntryId,
}: {
  userId: string;
  excludedLedgerEntryId?: string;
}) {
  const [entries, types] = await Promise.all([
    db
      .select({
        id: ammoLedgerEntry.id,
        ammoTypeId: ammoLedgerEntry.ammoTypeId,
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
          excludedLedgerEntryId ? ne(ammoLedgerEntry.id, excludedLedgerEntryId) : undefined,
        ),
      ),
    db.select().from(ammoType).where(eq(ammoType.userId, userId)).orderBy(ammoType.name),
  ]);

  return computeInventoryItems({ entries, ammoTypes: types });
}
