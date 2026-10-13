import Link from "next/link";
import type { ammoAcquisitionPermit } from "@/db/schema/ammo-ledger";
import { formatStockQuantity } from "@/features/ammo-ledger/ledger/format-ledger-quantity/format-ledger-quantity";
import {
  computeDaysUntilExpiry,
  formatPermitExpiryLabel,
  isPermitActive,
} from "@/features/ammo-ledger/permit/compute-permit-expiry/compute-permit-expiry";
import type { LedgerPurpose } from "@/features/ammo-ledger/schema/ledger-purpose";
import { ledgerPurposeLabels } from "@/features/ammo-ledger/schema/ledger-purpose";
import { cn } from "@/lib/cn";
import { formatIsoDateForDisplay } from "@/lib/date/format-iso-date-for-display";

type ActivePermitStatusProps = {
  permits: (typeof ammoAcquisitionPermit.$inferSelect)[];
  ledgerPurpose: LedgerPurpose;
  permitBalance: number;
  today: string;
};

const permitsSettingsHref = "/lab/ammo-ledger/settings/permits";

export function ActivePermitStatus({
  permits,
  ledgerPurpose,
  permitBalance,
  today,
}: ActivePermitStatusProps) {
  const purposePermits = permits.filter((permit) => permit.ledgerPurpose === ledgerPurpose);
  const activePermits = purposePermits.filter((permit) =>
    isPermitActive({ grantedOn: permit.grantedOn, expiresOn: permit.expiresOn, today }),
  );
  // 期限切れの許可と、残数を使い切った許可は帳簿では出さない（設定の譲受許可で確認できる）。
  // 許可残数は用途ごとの合計のため、残数が0なら有効期間内の許可も使い切ったものとして扱う。
  // これから有効になる許可は、まだ残数に入っていないため残す。
  const visiblePermits = purposePermits.filter(
    (permit) =>
      today < permit.grantedOn ||
      (permitBalance > 0 &&
        isPermitActive({ grantedOn: permit.grantedOn, expiresOn: permit.expiresOn, today })),
  );

  if (purposePermits.length === 0 && permitBalance <= 0) {
    return (
      <div className="rounded-lg border border-amber-500/30 bg-amber-500/5 px-4 py-3 text-sm">
        <p className="font-medium text-amber-800 dark:text-amber-200">譲受許可が未登録です</p>
        <p className="mt-1 text-muted-foreground">
          許可残数を帳簿に出すには、
          <Link href={permitsSettingsHref} className="underline">
            譲受許可
          </Link>
          を登録してください。
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1 text-sm">
        <span>
          <span className="text-muted-foreground">残り </span>
          <span className="text-lg font-semibold tabular-nums">
            {formatStockQuantity({ quantity: permitBalance })}
          </span>
        </span>
        <span className="text-muted-foreground">
          有効な許可 {permitBalance > 0 ? activePermits.length : 0}件（
          {ledgerPurposeLabels[ledgerPurpose]}）
        </span>
      </div>

      {visiblePermits.length > 0 ? (
        <ul className="flex flex-wrap gap-2">
          {visiblePermits.map((permit) => {
            const upcoming = today < permit.grantedOn;
            const urgent =
              !upcoming && computeDaysUntilExpiry({ expiresOn: permit.expiresOn, today }) <= 30;

            return (
              <li
                key={permit.id}
                className={cn(
                  "rounded-lg border px-3 py-2 text-xs",
                  upcoming
                    ? "border-border/30 bg-muted/10 text-muted-foreground"
                    : urgent
                      ? "border-amber-500/40 bg-amber-500/5"
                      : "border-border/50 bg-muted/20",
                )}
              >
                <span className="font-medium">
                  {permit.name} / {permit.permitPurpose}
                </span>
                <span className="mt-0.5 block tabular-nums">
                  {formatStockQuantity({ quantity: permit.quantity })} ·{" "}
                  {upcoming
                    ? `${formatIsoDateForDisplay({ value: permit.grantedOn })}から有効`
                    : formatPermitExpiryLabel({ expiresOn: permit.expiresOn, today })}
                </span>
              </li>
            );
          })}
        </ul>
      ) : null}

      {permitBalance <= 0 && visiblePermits.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          使える譲受許可はありません。新しい許可を受けたら
          <Link href={permitsSettingsHref} className="underline">
            譲受許可
          </Link>
          に登録してください。
        </p>
      ) : null}
    </div>
  );
}
