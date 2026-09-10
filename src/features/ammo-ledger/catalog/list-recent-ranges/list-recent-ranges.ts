import { and, desc, eq, max } from "drizzle-orm";
import { db } from "@/db";
import { ammoRange, ammoTransaction } from "@/db/schema/ammo-ledger";
import type { PickerMasterEntry } from "@/features/ammo-ledger/catalog/schema/catalog-entry";

export async function listRecentRanges({
  userId,
  limit = 8,
}: {
  userId: string;
  limit?: number;
}): Promise<PickerMasterEntry[]> {
  return db
    .select({
      id: ammoRange.id,
      name: ammoRange.name,
      address: ammoRange.address,
      catalogId: ammoRange.catalogId,
    })
    .from(ammoTransaction)
    .innerJoin(
      ammoRange,
      and(eq(ammoTransaction.rangeId, ammoRange.id), eq(ammoRange.userId, userId)),
    )
    .where(eq(ammoTransaction.userId, userId))
    .groupBy(ammoRange.id)
    .orderBy(desc(max(ammoTransaction.occurredOn)))
    .limit(limit);
}
