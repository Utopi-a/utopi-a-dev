import type { AmmoLedgerMutationTx } from "@/features/ammo-ledger/ledger/lock/acquire-ledger-advisory-lock/acquire-ledger-advisory-lock";
import { checkDatesAgainstLock } from "@/features/ammo-ledger/ledger/lock/check-dates-against-lock/check-dates-against-lock";
import { formatLockedDateError } from "@/features/ammo-ledger/ledger/lock/format-locked-date-error/format-locked-date-error";
import { getLatestLockState } from "@/features/ammo-ledger/ledger/lock/get-latest-lock-state/get-latest-lock-state";

export async function assertDatesNotLocked({
  userId,
  dates,
  executor,
}: {
  userId: string;
  dates: string[];
  executor?: AmmoLedgerMutationTx;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  const lockState = await getLatestLockState({ userId, executor });
  const result = checkDatesAgainstLock({ lockState, dates });

  if (result.blocked) {
    return {
      ok: false,
      error: formatLockedDateError({ lockedThrough: result.lockedThrough }),
    };
  }

  return { ok: true };
}
