import { and, eq, gte, isNull, lte } from "drizzle-orm";
import { db } from "@/db";
import { ammoLedgerEntry } from "@/db/schema/ammo-ledger";

export async function listLedgerEntries({
  userId,
  from,
  to,
}: {
  userId: string;
  from?: string;
  to?: string;
}) {
  const conditions = [eq(ammoLedgerEntry.userId, userId), isNull(ammoLedgerEntry.voidedAt)];

  if (from) {
    conditions.push(gte(ammoLedgerEntry.occurredOn, from));
  }
  if (to) {
    conditions.push(lte(ammoLedgerEntry.occurredOn, to));
  }

  return db
    .select()
    .from(ammoLedgerEntry)
    .where(and(...conditions))
    .orderBy(ammoLedgerEntry.occurredOn);
}
