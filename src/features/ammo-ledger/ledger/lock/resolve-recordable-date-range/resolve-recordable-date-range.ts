import type { LedgerLockState } from "@/features/ammo-ledger/ledger/lock/lock-state-types";

function addOneDay({ date }: { date: string }): string {
  const next = new Date(`${date}T00:00:00Z`);
  next.setUTCDate(next.getUTCDate() + 1);
  return next.toISOString().slice(0, 10);
}

/**
 * 記録の日付として選べる範囲。未来の日付と、ロック済みの期間は保存できないため選ばせない。
 */
export function resolveRecordableDateRange({
  lockState,
  today,
}: {
  lockState?: LedgerLockState;
  today: string;
}): { min?: string; max: string } {
  const lockedThrough = lockState?.isLocked ? lockState.lockedThrough : null;
  return {
    min: lockedThrough ? addOneDay({ date: lockedThrough }) : undefined,
    max: today,
  };
}
