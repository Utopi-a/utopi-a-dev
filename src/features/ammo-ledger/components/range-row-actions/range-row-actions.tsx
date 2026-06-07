"use client";

import { MasterRowActions } from "@/features/ammo-ledger/components/master-row-actions/master-row-actions";
import { deleteRangeAction } from "@/features/ammo-ledger/master/delete-range/delete-range-action";

type RangeRowActionsProps = {
  rangeId: string;
};

export function RangeRowActions({ rangeId }: RangeRowActionsProps) {
  return (
    <MasterRowActions
      editHref={`/lab/ammo-ledger/settings/ranges/${rangeId}/edit`}
      recordId={rangeId}
      deletedSubject="射撃場"
      deleteAction={deleteRangeAction}
    />
  );
}
