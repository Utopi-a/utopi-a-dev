import type { ammoLedgerEntry, ammoType } from "@/db/schema/ammo-ledger";
import { computeStockByAmmoType } from "@/features/ammo-ledger/ledger/compute-stock/compute-stock";
import type { LedgerCategory } from "@/features/ammo-ledger/schema/ledger-category";
import type { AmmoLedgerInventoryItem } from "@/features/ammo-ledger/workspace/ammo-ledger-workspace-types";

type InventoryEntry = Pick<
  typeof ammoLedgerEntry.$inferSelect,
  "ammoTypeId" | "category" | "quantity"
>;

export function computeInventoryItems({
  entries,
  ammoTypes,
}: {
  entries: InventoryEntry[];
  ammoTypes: (typeof ammoType.$inferSelect)[];
}): AmmoLedgerInventoryItem[] {
  const stockMap = computeStockByAmmoType({
    entries: entries
      .filter((entry) => entry.ammoTypeId !== null)
      .map((entry) => ({
        ammoTypeId: entry.ammoTypeId as string,
        category: entry.category as LedgerCategory,
        quantity: entry.quantity,
      })),
  });

  return ammoTypes.map((type) => ({
    ammoType: type,
    bookStock: stockMap.get(type.id) ?? 0,
  }));
}
