import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { ammoAcquisitionPermit } from "@/db/schema/ammo-ledger";
import type { LedgerPurpose } from "@/features/ammo-ledger/schema/ledger-purpose";

export async function listAcquisitionPermits({
  userId,
  ledgerPurpose,
}: {
  userId: string;
  ledgerPurpose?: LedgerPurpose;
}) {
  const conditions = [eq(ammoAcquisitionPermit.userId, userId)];
  if (ledgerPurpose) {
    conditions.push(eq(ammoAcquisitionPermit.ledgerPurpose, ledgerPurpose));
  }

  return db
    .select()
    .from(ammoAcquisitionPermit)
    .where(and(...conditions))
    .orderBy(ammoAcquisitionPermit.grantedOn);
}
