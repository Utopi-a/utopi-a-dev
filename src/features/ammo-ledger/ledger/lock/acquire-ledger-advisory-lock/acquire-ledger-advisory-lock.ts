import { sql } from "drizzle-orm";
import type { db } from "@/db";

export type AmmoLedgerMutationTx = Parameters<Parameters<typeof db.transaction>[0]>[0];

const ledgerAdvisoryLockSeed = 104729;

export async function acquireLedgerAdvisoryLock({
  tx,
  userId,
}: {
  tx: AmmoLedgerMutationTx;
  userId: string;
}) {
  await tx.execute(
    sql`select pg_advisory_xact_lock(hashtextextended(${userId}, cast(${ledgerAdvisoryLockSeed} as bigint)))`,
  );
}
