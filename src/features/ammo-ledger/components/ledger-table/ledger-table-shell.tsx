"use client";

import { type ReactNode, useMemo } from "react";
import type {
  ammoAcquisitionPermit,
  ammoLedgerEntry,
  ammoPermitEvent,
} from "@/db/schema/ammo-ledger";
import { LedgerTable } from "@/features/ammo-ledger/components/ledger-table/ledger-table";
import { buildLedgerDisplayRows } from "@/features/ammo-ledger/ledger/build-ledger-display-rows/build-ledger-display-rows";
import { buildLedgerRowBalances } from "@/features/ammo-ledger/ledger/build-ledger-row-balances/build-ledger-row-balances";
import type { LedgerLockState } from "@/features/ammo-ledger/ledger/lock/lock-state-types";
import type { LedgerPurpose } from "@/features/ammo-ledger/schema/ledger-purpose";

type LedgerTableShellProps = {
  entries: (typeof ammoLedgerEntry.$inferSelect)[];
  permitEvents: (typeof ammoPermitEvent.$inferSelect)[];
  permits: (typeof ammoAcquisitionPermit.$inferSelect)[];
  purpose: LedgerPurpose;
  today: string;
  from: string;
  to: string;
  permitBalances?: Map<string, number>;
  homeStorageExceededEntryIds?: string[];
  highlightedEntryId?: string | null;
  lockState?: LedgerLockState;
  savingEntryIds?: ReadonlySet<string>;
  emptyState: ReactNode;
};

export function LedgerTableShell({
  entries,
  permitEvents,
  permits,
  purpose,
  today,
  from,
  to,
  permitBalances,
  homeStorageExceededEntryIds = [],
  highlightedEntryId,
  lockState,
  savingEntryIds,
  emptyState,
}: LedgerTableShellProps) {
  const displayRows = useMemo(
    () =>
      buildLedgerDisplayRows({
        entries,
        permitEvents,
        permits,
        purpose,
        today,
        from,
        to,
      }),
    [entries, permitEvents, permits, purpose, today, from, to],
  );
  const rowBalances = useMemo(
    () => buildLedgerRowBalances({ entries, from, to }),
    [entries, from, to],
  );

  return (
    <LedgerTable
      rows={displayRows}
      rowBalances={rowBalances}
      purpose={purpose}
      permitBalances={permitBalances}
      homeStorageExceededEntryIds={homeStorageExceededEntryIds}
      highlightedEntryId={highlightedEntryId}
      lockState={lockState}
      savingEntryIds={savingEntryIds}
      emptyState={emptyState}
    />
  );
}
