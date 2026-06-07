import { and, desc, eq, isNotNull, max } from "drizzle-orm";
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
  const recentRows = await db
    .select({
      rangeId: ammoTransaction.rangeId,
      lastUsedOn: max(ammoTransaction.occurredOn),
    })
    .from(ammoTransaction)
    .where(and(eq(ammoTransaction.userId, userId), isNotNull(ammoTransaction.rangeId)))
    .groupBy(ammoTransaction.rangeId)
    .orderBy(desc(max(ammoTransaction.occurredOn)))
    .limit(limit);

  const rangeIds = recentRows
    .map((row) => row.rangeId)
    .filter((rangeId): rangeId is string => rangeId !== null);

  if (rangeIds.length === 0) {
    return [];
  }

  const ranges = await db.select().from(ammoRange).where(eq(ammoRange.userId, userId));
  const rangeById = new Map(ranges.map((range) => [range.id, range]));

  return rangeIds.flatMap((rangeId) => {
    const range = rangeById.get(rangeId);
    if (!range) {
      return [];
    }

    return [
      {
        id: range.id,
        name: range.name,
        address: range.address,
        catalogId: range.catalogId,
      },
    ];
  });
}
