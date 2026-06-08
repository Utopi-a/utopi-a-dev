import type { ammoType } from "@/db/schema/ammo-ledger";
import { buildStockByAmmoTypeId } from "@/features/ammo-ledger/master/build-stock-by-ammo-type-id/build-stock-by-ammo-type-id";
import type { AmmoLedgerWorkspace } from "@/features/ammo-ledger/workspace/ammo-ledger-workspace-types";

export function deriveAmmoTypesFromWorkspace({
  workspace,
}: {
  workspace: AmmoLedgerWorkspace;
}): (typeof ammoType.$inferSelect)[] {
  return workspace.inventoryItems.map((item) => item.ammoType);
}

export function deriveFormWorkspaceData({ workspace }: { workspace: AmmoLedgerWorkspace }) {
  const inventoryItems = workspace.inventoryItems;

  return {
    guns: workspace.guns,
    ammoTypes: deriveAmmoTypesFromWorkspace({ workspace }),
    stockByAmmoTypeId: buildStockByAmmoTypeId({ inventoryItems }),
  };
}
