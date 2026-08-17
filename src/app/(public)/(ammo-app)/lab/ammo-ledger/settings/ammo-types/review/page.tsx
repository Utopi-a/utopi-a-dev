import Link from "next/link";
import { requireAmmoUser } from "@/features/ammo-ledger/auth/require-ammo-user";
import { AmmoLedgerPanel } from "@/features/ammo-ledger/components/ammo-ledger-panel/ammo-ledger-panel";
import { ClassificationReviewStatus } from "@/features/ammo-ledger/components/ammo-type-classification-review/classification-review-status";
import { OrphanEntryRow } from "@/features/ammo-ledger/components/ammo-type-classification-review/orphan-entry-row";
import { UnconfirmedAmmoTypeRow } from "@/features/ammo-ledger/components/ammo-type-classification-review/unconfirmed-ammo-type-row";
import { countClassificationReviewStatus } from "@/features/ammo-ledger/master/ammo-type-classification-review/count-classification-review-status";
import { listOrphanLedgerEntries } from "@/features/ammo-ledger/master/ammo-type-classification-review/list-orphan-ledger-entries";
import { listUnconfirmedAmmoTypes } from "@/features/ammo-ledger/master/ammo-type-classification-review/list-unconfirmed-ammo-types";

export default async function AmmoTypeClassificationReviewPage() {
  const user = await requireAmmoUser();
  const [unconfirmedTypes, orphanEntries, status] = await Promise.all([
    listUnconfirmedAmmoTypes({ userId: user.id }),
    listOrphanLedgerEntries({ userId: user.id }),
    countClassificationReviewStatus({ userId: user.id }),
  ]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-2xl font-semibold tracking-tight">弾種分類の確認</h1>
        <Link href="/lab/ammo-ledger/settings/ammo-types" className="text-sm text-muted-foreground">
          弾種一覧へ戻る
        </Link>
      </div>

      <ClassificationReviewStatus
        unconfirmedCount={status.unconfirmedCount}
        orphanCount={status.orphanCount}
      />

      {unconfirmedTypes.length > 0 ? (
        <AmmoLedgerPanel
          title="未確認の弾種"
          description="現在の分類を確認し、必要に応じて修正してください。確認すると関連する帳簿記録のスナップショットも更新されます。"
        >
          <div className="space-y-4">
            {unconfirmedTypes.map((type) => (
              <UnconfirmedAmmoTypeRow key={type.id} ammoType={type} />
            ))}
          </div>
        </AmmoLedgerPanel>
      ) : null}

      {orphanEntries.length > 0 ? (
        <AmmoLedgerPanel
          title="孤立した帳簿記録"
          description="弾種マスタに紐付いていない記録です。分類情報を入力して補正してください。"
        >
          <div className="space-y-4">
            {orphanEntries.map((entry) => (
              <OrphanEntryRow key={entry.id} entry={entry} />
            ))}
          </div>
        </AmmoLedgerPanel>
      ) : null}

      {unconfirmedTypes.length === 0 && orphanEntries.length === 0 ? (
        <p className="text-sm text-muted-foreground">確認が必要な項目はありません。</p>
      ) : null}
    </div>
  );
}
