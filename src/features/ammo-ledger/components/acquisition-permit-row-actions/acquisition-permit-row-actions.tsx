"use client";

import { MasterRowActions } from "@/features/ammo-ledger/components/master-row-actions/master-row-actions";
import { deleteAcquisitionPermitAction } from "@/features/ammo-ledger/permit/delete-acquisition-permit/delete-acquisition-permit-action";

type AcquisitionPermitRowActionsProps = {
  permitId: string;
};

export function AcquisitionPermitRowActions({ permitId }: AcquisitionPermitRowActionsProps) {
  return (
    <MasterRowActions
      recordId={permitId}
      deletedSubject="譲受許可"
      deleteAction={deleteAcquisitionPermitAction}
    />
  );
}
