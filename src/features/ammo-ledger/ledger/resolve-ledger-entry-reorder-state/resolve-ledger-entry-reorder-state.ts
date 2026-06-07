import type { LedgerDisplayRow } from "@/features/ammo-ledger/ledger/build-ledger-display-rows/build-ledger-display-rows";
import { compareLedgerEntries } from "@/features/ammo-ledger/ledger/compare-ledger-entries/compare-ledger-entries";

export function resolveLedgerEntryReorderState({
  rows,
  ledgerEntryId,
}: {
  rows: LedgerDisplayRow[];
  ledgerEntryId: string;
}): { canMoveUp: boolean; canMoveDown: boolean } {
  const targetRow = rows.find((row) => row.kind === "entry" && row.entry.id === ledgerEntryId);
  if (!targetRow || targetRow.kind !== "entry") {
    return { canMoveUp: false, canMoveDown: false };
  }

  const sameDayEntryRows = rows
    .filter(
      (row): row is Extract<LedgerDisplayRow, { kind: "entry" }> =>
        row.kind === "entry" && row.entry.occurredOn === targetRow.entry.occurredOn,
    )
    .sort((a, b) => compareLedgerEntries({ a: a.entry, b: b.entry }));

  const index = sameDayEntryRows.findIndex((row) => row.entry.id === ledgerEntryId);

  return {
    canMoveUp: index > 0,
    canMoveDown: index >= 0 && index < sameDayEntryRows.length - 1,
  };
}
