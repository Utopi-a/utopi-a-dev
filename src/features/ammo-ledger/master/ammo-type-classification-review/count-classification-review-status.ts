import { and, count, eq, isNull, or } from "drizzle-orm";
import { db } from "@/db";
import { ammoLedgerEntry, ammoType } from "@/db/schema/ammo-ledger";

export async function countClassificationReviewStatus({ userId }: { userId: string }) {
  const [[unconfirmedResult], [orphanResult]] = await Promise.all([
    db
      .select({ count: count() })
      .from(ammoType)
      .where(and(eq(ammoType.userId, userId), isNull(ammoType.classificationConfirmedAt))),
    db
      .select({ count: count() })
      .from(ammoLedgerEntry)
      .where(
        and(
          eq(ammoLedgerEntry.userId, userId),
          isNull(ammoLedgerEntry.ammoTypeId),
          isNull(ammoLedgerEntry.voidedAt),
          or(isNull(ammoLedgerEntry.ammoCartridgeType), isNull(ammoLedgerEntry.ammoCaliber)),
        ),
      ),
  ]);
  return {
    unconfirmedCount: unconfirmedResult?.count ?? 0,
    orphanCount: orphanResult?.count ?? 0,
  };
}
