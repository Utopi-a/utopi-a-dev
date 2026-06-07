import { and, desc, eq, isNotNull, max } from "drizzle-orm";
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
  const recentRows = await db
    .select({
      counterpartyId: ammoTransaction.counterpartyId,
      lastUsedOn: max(ammoTransaction.occurredOn),
    })
    .from(ammoTransaction)
    .where(and(eq(ammoTransaction.userId, userId), isNotNull(ammoTransaction.counterpartyId)))
    .groupBy(ammoTransaction.counterpartyId)
    .orderBy(desc(max(ammoTransaction.occurredOn)))
    .limit(limit);

  const counterpartyIds = recentRows
    .map((row) => row.counterpartyId)
    .filter((counterpartyId): counterpartyId is string => counterpartyId !== null);

  if (counterpartyIds.length === 0) {
    return [];
  }

  const counterparties = await db
    .select()
    .from(ammoCounterparty)
    .where(eq(ammoCounterparty.userId, userId));
  const counterpartyById = new Map(counterparties.map((item) => [item.id, item]));

  return counterpartyIds.flatMap((counterpartyId) => {
    const counterparty = counterpartyById.get(counterpartyId);
    if (!counterparty) {
      return [];
    }

    return [
      {
        id: counterparty.id,
        name: counterparty.name,
        address: counterparty.address,
        catalogId: counterparty.catalogId,
      },
    ];
  });
}
