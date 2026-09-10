import { and, desc, eq, max } from "drizzle-orm";
import { db } from "@/db";
import { ammoCounterparty, ammoTransaction } from "@/db/schema/ammo-ledger";
import type { PickerMasterEntry } from "@/features/ammo-ledger/catalog/schema/catalog-entry";

export async function listRecentCounterparties({
  userId,
  limit = 8,
}: {
  userId: string;
  limit?: number;
}): Promise<PickerMasterEntry[]> {
  return db
    .select({
      id: ammoCounterparty.id,
      name: ammoCounterparty.name,
      address: ammoCounterparty.address,
      catalogId: ammoCounterparty.catalogId,
    })
    .from(ammoTransaction)
    .innerJoin(
      ammoCounterparty,
      and(
        eq(ammoTransaction.counterpartyId, ammoCounterparty.id),
        eq(ammoCounterparty.userId, userId),
      ),
    )
    .where(eq(ammoTransaction.userId, userId))
    .groupBy(ammoCounterparty.id)
    .orderBy(desc(max(ammoTransaction.occurredOn)))
    .limit(limit);
}
