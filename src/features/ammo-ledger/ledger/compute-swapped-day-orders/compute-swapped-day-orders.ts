import type { LedgerEntrySortKey } from "@/features/ammo-ledger/ledger/compare-ledger-entries/compare-ledger-entries";
import { compareLedgerEntries } from "@/features/ammo-ledger/ledger/compare-ledger-entries/compare-ledger-entries";

export type ReorderableLedgerEntry = LedgerEntrySortKey & {
  id: string;
};

export function computeSwappedDayOrders({
  entries,
  ledgerEntryId,
  direction,
}: {
  entries: ReorderableLedgerEntry[];
  ledgerEntryId: string;
  direction: "up" | "down";
}): Map<string, number> | null {
  const sorted = [...entries].sort((a, b) => compareLedgerEntries({ a, b }));
  const index = sorted.findIndex((entry) => entry.id === ledgerEntryId);
  if (index === -1) {
    return null;
  }

  const swapIndex = direction === "up" ? index - 1 : index + 1;
  if (swapIndex < 0 || swapIndex >= sorted.length) {
    return null;
  }

  const current = sorted[index];
  const neighbor = sorted[swapIndex];
  const currentOrder = current.dayOrder ?? 0;
  const neighborOrder = neighbor.dayOrder ?? 0;

  if (currentOrder === neighborOrder) {
    if (direction === "up") {
      return new Map([
        [current.id, neighborOrder],
        [neighbor.id, neighborOrder + 1],
      ]);
    }

    return new Map([
      [current.id, neighborOrder + 1],
      [neighbor.id, neighborOrder],
    ]);
  }

  return new Map([
    [current.id, neighborOrder],
    [neighbor.id, currentOrder],
  ]);
}
