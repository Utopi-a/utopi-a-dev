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
      deleteNote="帳簿の過去の記録は残りますが、帳簿印刷の別紙2の射撃場一覧は今登録している射撃場から作るため、過去の年を印刷し直してもこの射撃場は載りません。使わなくなった射撃場も削除せずに残しておくのがおすすめです。"
      deleteAction={deleteRangeAction}
    />
  );
}
