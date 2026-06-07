"use client";

import { MasterRowActions } from "@/features/ammo-ledger/components/master-row-actions/master-row-actions";
import { deleteGunAction } from "@/features/ammo-ledger/master/delete-gun/delete-gun-action";

type GunRowActionsProps = {
  gunId: string;
};

export function GunRowActions({ gunId }: GunRowActionsProps) {
  return (
    <MasterRowActions
      editHref={`/lab/ammo-ledger/settings/guns/${gunId}/edit`}
      recordId={gunId}
      deleteAction={deleteGunAction}
    />
  );
}
