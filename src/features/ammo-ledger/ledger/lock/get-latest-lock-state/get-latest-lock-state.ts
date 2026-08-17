import { desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { ammoLedgerLockEvent } from "@/db/schema/ammo-ledger";
import type { AmmoLedgerMutationTx } from "@/features/ammo-ledger/ledger/lock/acquire-ledger-advisory-lock/acquire-ledger-advisory-lock";
import type { LedgerLockState } from "@/features/ammo-ledger/ledger/lock/lock-state-types";

type LockStateExecutor = typeof db | AmmoLedgerMutationTx;

export async function getLatestLockState({
  userId,
  executor = db,
}: {
  userId: string;
  executor?: LockStateExecutor;
}): Promise<LedgerLockState> {
  const [latest] = await executor
    .select({
      eventKind: ammoLedgerLockEvent.eventKind,
      lockedThrough: ammoLedgerLockEvent.lockedThrough,
    })
    .from(ammoLedgerLockEvent)
    .where(eq(ammoLedgerLockEvent.userId, userId))
    .orderBy(desc(ammoLedgerLockEvent.createdAt), desc(ammoLedgerLockEvent.id))
    .limit(1);

  if (!latest || latest.eventKind === "unlock") {
    return { isLocked: false, lockedThrough: null };
  }

  return { isLocked: true, lockedThrough: latest.lockedThrough };
}
