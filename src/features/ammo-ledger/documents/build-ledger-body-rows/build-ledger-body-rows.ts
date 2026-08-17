import type { ammoLedgerEntry } from "@/db/schema/ammo-ledger";
import { classifyLedgerEntryFlow } from "@/features/ammo-ledger/documents/classify-ledger-entry-flow/classify-ledger-entry-flow";
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

function buildAmmoTypeBalanceKey({
  entry,
}: {
  entry: typeof ammoLedgerEntry.$inferSelect;
}): string {
  if (entry.ammoTypeId) {
    return `id:${entry.ammoTypeId}`;
  }

  return [
    "snapshot",
    entry.ammoCartridgeType ?? "",
    entry.ammoCaliber ?? "",
    entry.ammoGaugeNumber ?? "",
    entry.ammoTypeName,
  ].join("\u001f");
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

    const typeKey = buildAmmoTypeBalanceKey({ entry });
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
