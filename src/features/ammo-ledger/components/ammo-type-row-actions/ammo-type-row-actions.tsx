"use client";

import { MasterRowActions } from "@/features/ammo-ledger/components/master-row-actions/master-row-actions";
import { deleteAmmoTypeAction } from "@/features/ammo-ledger/master/delete-ammo-type/delete-ammo-type-action";

type AmmoTypeRowActionsProps = {
  ammoTypeId: string;
  isInUse: boolean;
};

export function AmmoTypeRowActions({ ammoTypeId, isInUse }: AmmoTypeRowActionsProps) {
  return (
    <MasterRowActions
      editHref={`/lab/ammo-ledger/settings/ammo-types/${ammoTypeId}/edit`}
      recordId={ammoTypeId}
      deletedSubject="弾種"
      deleteNote="帳簿や取引で使っている弾種は削除できません。"
      deleteDisabledReason={isInUse ? "帳簿で使用中のため削除できません" : undefined}
      deleteAction={deleteAmmoTypeAction}
    />
  );
}
