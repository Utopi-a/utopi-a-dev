import { and, eq, isNull, or } from "drizzle-orm";
import { db } from "@/db";
import { ammoLedgerEntry } from "@/db/schema/ammo-ledger";

export async function listOrphanLedgerEntries({ userId }: { userId: string }) {
  return db
    .select({
      id: ammoLedgerEntry.id,
      ammoTypeName: ammoLedgerEntry.ammoTypeName,
      ammoCartridgeType: ammoLedgerEntry.ammoCartridgeType,
      ammoCaliber: ammoLedgerEntry.ammoCaliber,
      ammoGaugeNumber: ammoLedgerEntry.ammoGaugeNumber,
      category: ammoLedgerEntry.category,
      occurredOn: ammoLedgerEntry.occurredOn,
      quantity: ammoLedgerEntry.quantity,
    })
    .from(ammoLedgerEntry)
    .where(
      and(
        eq(ammoLedgerEntry.userId, userId),
        isNull(ammoLedgerEntry.ammoTypeId),
        isNull(ammoLedgerEntry.voidedAt),
        or(isNull(ammoLedgerEntry.ammoCartridgeType), isNull(ammoLedgerEntry.ammoCaliber)),
      ),
    )
    .orderBy(ammoLedgerEntry.occurredOn);
}

export type OrphanLedgerEntry = Awaited<ReturnType<typeof listOrphanLedgerEntries>>[number];
