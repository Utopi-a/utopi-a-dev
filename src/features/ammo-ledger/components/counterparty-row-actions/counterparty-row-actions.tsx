"use client";

import { MasterRowActions } from "@/features/ammo-ledger/components/master-row-actions/master-row-actions";
import { deleteCounterpartyAction } from "@/features/ammo-ledger/master/delete-counterparty/delete-counterparty-action";

type CounterpartyRowActionsProps = {
  counterpartyId: string;
};

export function CounterpartyRowActions({ counterpartyId }: CounterpartyRowActionsProps) {
  return (
    <MasterRowActions
      editHref={`/lab/ammo-ledger/settings/counterparties/${counterpartyId}/edit`}
      recordId={counterpartyId}
      deleteAction={deleteCounterpartyAction}
    />
  );
}
