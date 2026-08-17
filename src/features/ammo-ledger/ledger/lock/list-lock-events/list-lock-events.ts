import { desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { ammoLedgerLockEvent } from "@/db/schema/ammo-ledger";

export async function listLockEvents({ userId }: { userId: string }) {
  return db
    .select()
    .from(ammoLedgerLockEvent)
    .where(eq(ammoLedgerLockEvent.userId, userId))
    .orderBy(desc(ammoLedgerLockEvent.createdAt), desc(ammoLedgerLockEvent.id));
}
