import type { LedgerLockState } from "@/features/ammo-ledger/ledger/lock/lock-state-types";

export function checkDatesAgainstLock({
  lockState,
  dates,
}: {
  lockState: LedgerLockState;
  dates: string[];
}): { blocked: false } | { blocked: true; lockedThrough: string } {
  if (!lockState.isLocked || lockState.lockedThrough === null) {
    return { blocked: false };
  }

  const lockedThrough = lockState.lockedThrough;

  for (const date of dates) {
    if (date <= lockedThrough) {
      return { blocked: true, lockedThrough };
    }
  }

  return { blocked: false };
}
