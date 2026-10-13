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
      deletedSubject="銃"
      deleteNote="帳簿の過去の記録は残りますが、帳簿印刷の別紙1「使用銃の一覧」は今登録している銃から作るため、過去の年を印刷し直してもこの銃は載りません。売却・譲渡した銃も削除せずに残しておくのがおすすめです。"
      deleteAction={deleteGunAction}
    />
  );
}
