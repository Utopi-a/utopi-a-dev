import type { AmmoLedgerInventoryItem } from "@/features/ammo-ledger/workspace/ammo-ledger-workspace-types";

export function buildStockByAmmoTypeId({
  inventoryItems,
}: {
  inventoryItems: AmmoLedgerInventoryItem[];
}): Record<string, number> {
  return Object.fromEntries(inventoryItems.map((item) => [item.ammoType.id, item.bookStock]));
}
