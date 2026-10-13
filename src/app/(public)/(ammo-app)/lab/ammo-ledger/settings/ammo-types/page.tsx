import Link from "next/link";
import { requireAmmoUser } from "@/features/ammo-ledger/auth/require-ammo-user";
import { AmmoLedgerPanel } from "@/features/ammo-ledger/components/ammo-ledger-panel/ammo-ledger-panel";
import { AmmoTypeForm } from "@/features/ammo-ledger/components/ammo-type-form/ammo-type-form";
import { AmmoTypeRowActions } from "@/features/ammo-ledger/components/ammo-type-row-actions/ammo-type-row-actions";
import { MasterListItem } from "@/features/ammo-ledger/components/master-list-item/master-list-item";
import { ReturnToRecordLink } from "@/features/ammo-ledger/components/return-to-record-link/return-to-record-link";
import { countClassificationReviewStatus } from "@/features/ammo-ledger/master/ammo-type-classification-review/count-classification-review-status";
import { listAmmoTypeIdsInUse } from "@/features/ammo-ledger/master/list-ammo-type-ids-in-use/list-ammo-type-ids-in-use";
import { listAmmoTypes } from "@/features/ammo-ledger/master/list-ammo-types/list-ammo-types";
import {
  resolveReturnToPath,
  returnToSearchParam,
} from "@/features/ammo-ledger/navigation/resolve-return-to-path/resolve-return-to-path";
import type { CartridgeType } from "@/features/ammo-ledger/schema/cartridge-type";
import { cartridgeTypeLabels } from "@/features/ammo-ledger/schema/cartridge-type";

export const metadata = { title: "弾種" };

type PageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function AmmoTypesSettingsPage({ searchParams }: PageProps) {
  const user = await requireAmmoUser();
  const [ammoTypes, reviewStatus, ammoTypeIdsInUse, params] = await Promise.all([
    listAmmoTypes({ userId: user.id }),
    countClassificationReviewStatus({ userId: user.id }),
    listAmmoTypeIdsInUse({ userId: user.id }),
    searchParams,
  ]);
  const returnTo = resolveReturnToPath({ value: params[returnToSearchParam] });

  const reviewTotal = reviewStatus.unconfirmedCount + reviewStatus.orphanCount;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold tracking-tight">弾種</h1>
      {/* 追加した直後にトーストやフォームに隠れず見えるよう、一覧より上に置く。 */}
      {returnTo && ammoTypes.length > 0 ? <ReturnToRecordLink href={returnTo} /> : null}
      {reviewTotal > 0 ? (
        <Link
          href="/lab/ammo-ledger/settings/ammo-types/review"
          className="block rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:border-amber-700 dark:bg-amber-950/30 dark:text-amber-300"
        >
          未確認 {reviewTotal}件 — 弾種分類を確認する →
        </Link>
      ) : null}
      <AmmoLedgerPanel title="登録済み">
        {ammoTypes.length === 0 ? (
          <p className="text-sm text-muted-foreground">まだ登録がありません。</p>
        ) : (
          <ul className="divide-y divide-border/50 text-sm">
            {ammoTypes.map((type) => (
              <MasterListItem
                key={type.id}
                className="flex items-start justify-between gap-4 py-3 first:pt-0 last:pb-0"
              >
                <span>
                  {type.name} — {type.caliber}{" "}
                  {cartridgeTypeLabels[type.cartridgeType as CartridgeType]}（1箱
                  {type.roundsPerBox}発）
                </span>
                <AmmoTypeRowActions ammoTypeId={type.id} isInUse={ammoTypeIdsInUse.has(type.id)} />
              </MasterListItem>
            ))}
          </ul>
        )}
      </AmmoLedgerPanel>
      <AmmoLedgerPanel title="追加">
        <AmmoTypeForm />
      </AmmoLedgerPanel>
    </div>
  );
}
