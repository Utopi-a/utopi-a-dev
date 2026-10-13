"use client";

import { useMemo } from "react";
import type {
  ammoAcquisitionPermit,
  ammoLedgerEntry,
  ammoPermitEvent,
} from "@/db/schema/ammo-ledger";
import { LedgerTable } from "@/features/ammo-ledger/components/ledger-table/ledger-table";
import { buildLedgerDisplayRows } from "@/features/ammo-ledger/ledger/build-ledger-display-rows/build-ledger-display-rows";
import type { LedgerLockState } from "@/features/ammo-ledger/ledger/lock/lock-state-types";
import type { LedgerPurpose } from "@/features/ammo-ledger/schema/ledger-purpose";

type LedgerTableShellProps = {
  entries: (typeof ammoLedgerEntry.$inferSelect)[];
  permitEvents: (typeof ammoPermitEvent.$inferSelect)[];
  permits: (typeof ammoAcquisitionPermit.$inferSelect)[];
  purpose: LedgerPurpose;
  today: string;
  permitBalances?: Map<string, number>;
  homeStorageExceededEntryIds?: string[];
  highlightedEntryId?: string | null;
  lockState?: LedgerLockState;
  savingEntryIds?: ReadonlySet<string>;
};

export function LedgerTableShell({
  entries,
  permitEvents,
  permits,
  purpose,
  today,
  permitBalances,
  homeStorageExceededEntryIds = [],
  highlightedEntryId,
  lockState,
  savingEntryIds,
}: LedgerTableShellProps) {
  const displayRows = useMemo(
    () =>
      buildLedgerDisplayRows({
        entries,
        permitEvents,
        permits,
        purpose,
        today,
      }),
    [entries, permitEvents, permits, purpose, today],
  );

  return (
    <LedgerTable
      rows={displayRows}
      purpose={purpose}
      permitBalances={permitBalances}
      homeStorageExceededEntryIds={homeStorageExceededEntryIds}
      highlightedEntryId={highlightedEntryId}
      lockState={lockState}
      savingEntryIds={savingEntryIds}
    />
  );
}
