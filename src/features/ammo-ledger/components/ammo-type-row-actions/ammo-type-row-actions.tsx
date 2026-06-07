"use client";

import { MasterRowActions } from "@/features/ammo-ledger/components/master-row-actions/master-row-actions";
import { deleteAmmoTypeAction } from "@/features/ammo-ledger/master/delete-ammo-type/delete-ammo-type-action";

type AmmoTypeRowActionsProps = {
  ammoTypeId: string;
};

export function AmmoTypeRowActions({ ammoTypeId }: AmmoTypeRowActionsProps) {
  return (
    <MasterRowActions
      editHref={`/lab/ammo-ledger/settings/ammo-types/${ammoTypeId}/edit`}
      recordId={ammoTypeId}
      deleteAction={deleteAmmoTypeAction}
    />
  );
}
