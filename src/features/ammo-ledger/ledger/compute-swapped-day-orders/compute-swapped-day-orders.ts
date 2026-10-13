import type { LedgerEntrySortKey } from "@/features/ammo-ledger/ledger/compare-ledger-entries/compare-ledger-entries";
import { compareLedgerEntries } from "@/features/ammo-ledger/ledger/compare-ledger-entries/compare-ledger-entries";

export type ReorderableLedgerEntry = LedgerEntrySortKey & {
  id: string;
  category?: string;
};

/**
 * 上下に隣り合う2件を入れ替えてよいか。
 * 繰越は帳簿上その日の最初の残数を表すため、通常の記録を繰越より上へ動かさない。
 */
export function canSwapAdjacentLedgerEntries({
  upper,
  lower,
}: {
  upper: Pick<ReorderableLedgerEntry, "category">;
  lower: Pick<ReorderableLedgerEntry, "category">;
}): boolean {
  return !(upper.category === "carryover" && lower.category !== "carryover");
}

export function computeSwappedDayOrders({
  entries,
  ledgerEntryId,
  direction,
}: {
  entries: ReorderableLedgerEntry[];
  ledgerEntryId: string;
  direction: "up" | "down";
}): Map<string, number> | null {
  const sorted = [...entries].sort(
    (a, b) => compareLedgerEntries({ a, b }) || a.id.localeCompare(b.id),
  );
  const index = sorted.findIndex((entry) => entry.id === ledgerEntryId);
  if (index === -1) {
    return null;
  }

  const swapIndex = direction === "up" ? index - 1 : index + 1;
  if (swapIndex < 0 || swapIndex >= sorted.length) {
    return null;
  }

  const upperIndex = Math.min(index, swapIndex);
  if (!canSwapAdjacentLedgerEntries({ upper: sorted[upperIndex], lower: sorted[upperIndex + 1] })) {
    return null;
  }

  // 同じ並び順の値が3件以上あると、2件の値の交換だけでは他の記録まで動く。
  // 今の表示順で 0..n-1 を振り直してから入れ替え、同じ日の全件の並び順を返す。
  const reordered = [...sorted];
  [reordered[index], reordered[swapIndex]] = [reordered[swapIndex], reordered[index]];
  return new Map(reordered.map((entry, nextOrder) => [entry.id, nextOrder]));
}
