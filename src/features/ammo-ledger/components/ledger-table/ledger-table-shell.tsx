"use client";

import { useMemo, useState } from "react";
import type {
  ammoAcquisitionPermit,
  ammoLedgerEntry,
  ammoPermitEvent,
} from "@/db/schema/ammo-ledger";
import { LedgerTable } from "@/features/ammo-ledger/components/ledger-table/ledger-table";
import { buildLedgerDisplayRows } from "@/features/ammo-ledger/ledger/build-ledger-display-rows/build-ledger-display-rows";
import type { LedgerPurpose } from "@/features/ammo-ledger/schema/ledger-purpose";

type LedgerTableShellProps = {
  entries: (typeof ammoLedgerEntry.$inferSelect)[];
  permitEvents: (typeof ammoPermitEvent.$inferSelect)[];
  permits: (typeof ammoAcquisitionPermit.$inferSelect)[];
  purpose: LedgerPurpose;
  permitBalances?: Map<string, number>;
  homeStorageExceededEntryIds?: string[];
};

export function LedgerTableShell({
  entries,
  permitEvents,
  permits,
  purpose,
  permitBalances,
  homeStorageExceededEntryIds = [],
}: LedgerTableShellProps) {
  const [voidedEntryIds, setVoidedEntryIds] = useState<string[]>([]);
  const voidedIdSet = useMemo(() => new Set(voidedEntryIds), [voidedEntryIds]);

  const visibleEntries = useMemo(
    () => entries.filter((entry) => !voidedIdSet.has(entry.id)),
    [entries, voidedIdSet],
  );

  const displayRows = useMemo(
    () =>
      buildLedgerDisplayRows({
        entries: visibleEntries,
        permitEvents,
        permits,
        purpose,
      }),
    [visibleEntries, permitEvents, permits, purpose],
  );

  function handleVoided({ ledgerEntryId }: { ledgerEntryId: string }) {
    setVoidedEntryIds((current) =>
      current.includes(ledgerEntryId) ? current : [...current, ledgerEntryId],
    );
  }

  function handleVoidFailed({ ledgerEntryId }: { ledgerEntryId: string }) {
    setVoidedEntryIds((current) => current.filter((id) => id !== ledgerEntryId));
  }

  return (
    <LedgerTable
      rows={displayRows}
      purpose={purpose}
      permitBalances={permitBalances}
      homeStorageExceededEntryIds={homeStorageExceededEntryIds}
      onVoided={handleVoided}
      onVoidFailed={handleVoidFailed}
    />
  );
}
