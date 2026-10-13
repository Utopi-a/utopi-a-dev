import type { ammoLedgerEntry } from "@/db/schema/ammo-ledger";
import { classifyLedgerEntryFlow } from "@/features/ammo-ledger/documents/classify-ledger-entry-flow/classify-ledger-entry-flow";
import { formatAmmoTypeLabel } from "@/features/ammo-ledger/documents/format-ammo-type-label/format-ammo-type-label";
import { compareLedgerEntries } from "@/features/ammo-ledger/ledger/compare-ledger-entries/compare-ledger-entries";

export type LedgerBodyRow = {
  no: number;
  entry: typeof ammoLedgerEntry.$inferSelect;
  flow: "receive" | "pay";
  balanceByType: number;
  totalBalance: number;
};

function compareEntriesWithId({
  a,
  b,
}: {
  a: typeof ammoLedgerEntry.$inferSelect;
  b: typeof ammoLedgerEntry.$inferSelect;
}): number {
  const sortResult = compareLedgerEntries({ a, b });
  if (sortResult !== 0) {
    return sortResult;
  }
  return a.id.localeCompare(b.id);
}

export function buildLedgerBodyRows({
  entries,
}: {
  entries: (typeof ammoLedgerEntry.$inferSelect)[];
}): LedgerBodyRow[] {
  const sorted = [...entries].sort((a, b) => compareEntriesWithId({ a, b }));

  const balanceByAmmoType = new Map<string, number>();
  let totalBalance = 0;

  return sorted.map((entry, index) => {
    const flow = classifyLedgerEntryFlow({
      category: entry.category,
      quantity: entry.quantity,
    });
    const absQuantity = Math.abs(entry.quantity);
    const delta = flow === "receive" ? absQuantity : -absQuantity;

    // 種類別残は帳票に印字する実包種類（番径・散弾/単弾など）の単位で数える。
    // 号数違いの弾種を別々に数えると、同じ「12番・散弾」の行どうしで残数がつながらない。
    const typeKey = formatAmmoTypeLabel({ snapshot: entry });
    const prevTypeBalance = balanceByAmmoType.get(typeKey) ?? 0;
    const newTypeBalance = prevTypeBalance + delta;
    balanceByAmmoType.set(typeKey, newTypeBalance);

    totalBalance += delta;

    return {
      no: index + 1,
      entry,
      flow,
      balanceByType: newTypeBalance,
      totalBalance,
    };
  });
}
