import { and, desc, eq, inArray, max, ne } from "drizzle-orm";
import { db } from "@/db";
import { ammoCounterparty, ammoTransaction } from "@/db/schema/ammo-ledger";
import type { PickerMasterEntry } from "@/features/ammo-ledger/catalog/schema/catalog-entry";
import type { InputKind } from "@/features/ammo-ledger/schema/input-kind";

/**
 * 最近の記録で使った相手方。取り消した記録の相手は含めない。
 * inputKinds を渡すと、その区分の記録で使った相手だけにする（購入先の既定値に譲渡先を選ばないため）。
 */
export async function listRecentCounterparties({
  userId,
  inputKinds,
  limit = 8,
}: {
  userId: string;
  inputKinds?: InputKind[];
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
    .where(
      and(
        eq(ammoTransaction.userId, userId),
        ne(ammoTransaction.status, "voided"),
        inputKinds ? inArray(ammoTransaction.inputKind, inputKinds) : undefined,
      ),
    )
    .groupBy(ammoCounterparty.id)
    .orderBy(desc(max(ammoTransaction.occurredOn)))
    .limit(limit);
}
