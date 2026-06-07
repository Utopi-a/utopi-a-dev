import { and, eq, isNull } from "drizzle-orm";
import { db } from "@/db";
import { ammoLedgerEntry, ammoType } from "@/db/schema/ammo-ledger";
import { computeInventoryItems } from "@/features/ammo-ledger/workspace/compute-inventory-items/compute-inventory-items";

export async function getInventorySummary({ userId }: { userId: string }) {
  const [entries, types] = await Promise.all([
    db
      .select({
        ammoTypeId: ammoLedgerEntry.ammoTypeId,
        category: ammoLedgerEntry.category,
        quantity: ammoLedgerEntry.quantity,
      })
      .from(ammoLedgerEntry)
      .where(and(eq(ammoLedgerEntry.userId, userId), isNull(ammoLedgerEntry.voidedAt))),
    db.select().from(ammoType).where(eq(ammoType.userId, userId)).orderBy(ammoType.name),
  ]);

  return computeInventoryItems({ entries, ammoTypes: types });
}
