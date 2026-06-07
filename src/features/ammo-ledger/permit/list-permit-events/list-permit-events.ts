import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { ammoPermitEvent } from "@/db/schema/ammo-ledger";
import type { LedgerPurpose } from "@/features/ammo-ledger/schema/ledger-purpose";

export async function listPermitEvents({
  userId,
  purpose,
}: {
  userId: string;
  purpose?: LedgerPurpose;
}) {
  const conditions = [eq(ammoPermitEvent.userId, userId)];
  if (purpose) {
    conditions.push(eq(ammoPermitEvent.purpose, purpose));
  }

  return db
    .select()
    .from(ammoPermitEvent)
    .where(and(...conditions))
    .orderBy(ammoPermitEvent.occurredOn);
}
