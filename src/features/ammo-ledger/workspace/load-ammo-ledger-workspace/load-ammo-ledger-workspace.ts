import { listLedgerEntries } from "@/features/ammo-ledger/ledger/list-ledger-entries/list-ledger-entries";
import { listAmmoTypes } from "@/features/ammo-ledger/master/list-ammo-types/list-ammo-types";
import { listGuns } from "@/features/ammo-ledger/master/list-guns/list-guns";
import { listAcquisitionPermits } from "@/features/ammo-ledger/permit/list-acquisition-permits/list-acquisition-permits";
import { listPermitEvents } from "@/features/ammo-ledger/permit/list-permit-events/list-permit-events";
import { getLedgerProfile } from "@/features/ammo-ledger/profile/get-ledger-profile/get-ledger-profile";
import type { AmmoLedgerWorkspace } from "@/features/ammo-ledger/workspace/ammo-ledger-workspace-types";
import { computeInventoryItems } from "@/features/ammo-ledger/workspace/compute-inventory-items/compute-inventory-items";

export async function loadAmmoLedgerWorkspace({
  userId,
}: {
  userId: string;
}): Promise<AmmoLedgerWorkspace> {
  const [entries, permitEvents, permits, profile, ammoTypes, guns] = await Promise.all([
    listLedgerEntries({ userId }),
    listPermitEvents({ userId }),
    listAcquisitionPermits({ userId }),
    getLedgerProfile({ userId }),
    listAmmoTypes({ userId }),
    listGuns({ userId }),
  ]);

  return {
    entries,
    permitEvents,
    permits,
    profile,
    inventoryItems: computeInventoryItems({ entries, ammoTypes }),
    guns,
  };
}
