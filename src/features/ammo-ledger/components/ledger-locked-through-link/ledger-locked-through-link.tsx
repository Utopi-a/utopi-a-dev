import Link from "next/link";
import type { LedgerLockState } from "@/features/ammo-ledger/ledger/lock/lock-state-types";
import { cn } from "@/lib/cn";
import { formatIsoDateForDisplay } from "@/lib/date/format-iso-date-for-display";

/** 確定日を示し、解除できる確定・ロックの設定へ案内する */
export function LedgerLockedThroughLink({
  lockState,
  className,
}: {
  lockState?: LedgerLockState;
  className?: string;
}) {
  if (!lockState?.isLocked || !lockState.lockedThrough) {
    return null;
  }

  return (
    <Link
      href="/lab/ammo-ledger/settings/ledger-lock"
      className={cn(
        "text-sm text-muted-foreground underline-offset-4 hover:text-foreground hover:underline",
        className,
      )}
    >
      {formatIsoDateForDisplay({ value: lockState.lockedThrough })} まで確定済み →
    </Link>
  );
}
