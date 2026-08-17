import Link from "next/link";
import { requireAmmoUser } from "@/features/ammo-ledger/auth/require-ammo-user";
import { AmmoLedgerPanel } from "@/features/ammo-ledger/components/ammo-ledger-panel/ammo-ledger-panel";
import { AmmoTypeForm } from "@/features/ammo-ledger/components/ammo-type-form/ammo-type-form";
import { AmmoTypeRowActions } from "@/features/ammo-ledger/components/ammo-type-row-actions/ammo-type-row-actions";
import { countClassificationReviewStatus } from "@/features/ammo-ledger/master/ammo-type-classification-review/count-classification-review-status";
import { listAmmoTypes } from "@/features/ammo-ledger/master/list-ammo-types/list-ammo-types";
import type { CartridgeType } from "@/features/ammo-ledger/schema/cartridge-type";
import { cartridgeTypeLabels } from "@/features/ammo-ledger/schema/cartridge-type";

export default async function AmmoTypesSettingsPage() {
  const user = await requireAmmoUser();
  const [ammoTypes, reviewStatus] = await Promise.all([
    listAmmoTypes({ userId: user.id }),
    countClassificationReviewStatus({ userId: user.id }),
  ]);

  const reviewTotal = reviewStatus.unconfirmedCount + reviewStatus.orphanCount;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold tracking-tight">弾種</h1>
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
              <li
                key={type.id}
                className="flex items-start justify-between gap-4 py-3 first:pt-0 last:pb-0"
              >
                <span>
                  {type.name} — {type.caliber}{" "}
                  {cartridgeTypeLabels[type.cartridgeType as CartridgeType]}（1箱
                  {type.roundsPerBox}発）
                </span>
                <AmmoTypeRowActions ammoTypeId={type.id} />
              </li>
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
