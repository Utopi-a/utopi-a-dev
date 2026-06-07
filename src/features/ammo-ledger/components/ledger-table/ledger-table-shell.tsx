"use client";

import { useMemo, useState } from "react";
import type { ammoLedgerEntry } from "@/db/schema/ammo-ledger";
import { LedgerTable } from "@/features/ammo-ledger/components/ledger-table/ledger-table";

type LedgerTableShellProps = {
  entries: (typeof ammoLedgerEntry.$inferSelect)[];
  permitBalances?: Map<string, number>;
  homeStorageExceededEntryIds?: string[];
};

export function LedgerTableShell({
  entries,
  permitBalances,
  homeStorageExceededEntryIds = [],
}: LedgerTableShellProps) {
  const [voidedEntryIds, setVoidedEntryIds] = useState<string[]>([]);
  const voidedIdSet = useMemo(() => new Set(voidedEntryIds), [voidedEntryIds]);

  const visibleEntries = useMemo(
    () => entries.filter((entry) => !voidedIdSet.has(entry.id)),
    [entries, voidedIdSet],
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
      entries={visibleEntries}
      permitBalances={permitBalances}
      homeStorageExceededEntryIds={homeStorageExceededEntryIds}
      onVoided={handleVoided}
      onVoidFailed={handleVoidFailed}
    />
  );
}
