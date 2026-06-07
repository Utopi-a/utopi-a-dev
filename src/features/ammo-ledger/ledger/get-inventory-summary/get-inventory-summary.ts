import { and, eq, isNull } from "drizzle-orm";
import { db } from "@/db";
import { ammoLedgerEntry, ammoType } from "@/db/schema/ammo-ledger";
import { computeStockByAmmoType } from "@/features/ammo-ledger/ledger/compute-stock/compute-stock";
import type { LedgerCategory } from "@/features/ammo-ledger/schema/ledger-category";

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

  const stockMap = computeStockByAmmoType({
    entries: entries
      .filter((e) => e.ammoTypeId !== null)
      .map((e) => ({
        ammoTypeId: e.ammoTypeId as string,
        category: e.category as LedgerCategory,
        quantity: e.quantity,
      })),
  });

  return types.map((type) => ({
    ammoType: type,
    bookStock: stockMap.get(type.id) ?? 0,
  }));
}
