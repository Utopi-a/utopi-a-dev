import { and, eq, gte, isNull, lte } from "drizzle-orm";
import { db } from "@/db";
import { ammoLedgerEntry } from "@/db/schema/ammo-ledger";
import type { LedgerPurpose } from "@/features/ammo-ledger/schema/ledger-purpose";

export async function listLedgerEntries({
  userId,
  purpose,
  from,
  to,
}: {
  userId: string;
  purpose?: LedgerPurpose;
  from?: string;
  to?: string;
}) {
  const conditions = [eq(ammoLedgerEntry.userId, userId), isNull(ammoLedgerEntry.voidedAt)];

  if (purpose) {
    conditions.push(eq(ammoLedgerEntry.purpose, purpose));
  }
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
