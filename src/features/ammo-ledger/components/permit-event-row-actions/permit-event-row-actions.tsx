"use client";

import { MasterRowActions } from "@/features/ammo-ledger/components/master-row-actions/master-row-actions";
import { deletePermitEventAction } from "@/features/ammo-ledger/permit/delete-permit-event/delete-permit-event-action";

type PermitEventRowActionsProps = {
  eventId: string;
};

export function PermitEventRowActions({ eventId }: PermitEventRowActionsProps) {
  return (
    <MasterRowActions
      recordId={eventId}
      deletedSubject="許可イベント"
      deleteAction={deletePermitEventAction}
    />
  );
}
