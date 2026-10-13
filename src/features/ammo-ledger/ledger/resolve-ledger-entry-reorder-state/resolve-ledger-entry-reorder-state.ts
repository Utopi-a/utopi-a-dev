import type { LedgerDisplayRow } from "@/features/ammo-ledger/ledger/build-ledger-display-rows/build-ledger-display-rows";
import { compareLedgerEntries } from "@/features/ammo-ledger/ledger/compare-ledger-entries/compare-ledger-entries";
import { canSwapAdjacentLedgerEntries } from "@/features/ammo-ledger/ledger/compute-swapped-day-orders/compute-swapped-day-orders";

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
    .sort(
      (a, b) =>
        compareLedgerEntries({ a: a.entry, b: b.entry }) || a.entry.id.localeCompare(b.entry.id),
    )
    .map((row) => row.entry);

  const index = sameDayEntryRows.findIndex((entry) => entry.id === ledgerEntryId);
  if (index === -1) {
    return { canMoveUp: false, canMoveDown: false };
  }

  const previous = sameDayEntryRows[index - 1];
  const next = sameDayEntryRows[index + 1];
  return {
    canMoveUp:
      previous !== undefined &&
      canSwapAdjacentLedgerEntries({ upper: previous, lower: sameDayEntryRows[index] }),
    canMoveDown:
      next !== undefined &&
      canSwapAdjacentLedgerEntries({ upper: sameDayEntryRows[index], lower: next }),
  };
}
