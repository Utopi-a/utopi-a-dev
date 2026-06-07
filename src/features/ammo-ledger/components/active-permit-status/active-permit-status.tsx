import Link from "next/link";
import type { ammoAcquisitionPermit } from "@/db/schema/ammo-ledger";
import {
  computeDaysUntilExpiry,
  formatPermitExpiryLabel,
  isPermitActive,
} from "@/features/ammo-ledger/permit/compute-permit-expiry/compute-permit-expiry";
import type { LedgerPurpose } from "@/features/ammo-ledger/schema/ledger-purpose";
import { ledgerPurposeLabels } from "@/features/ammo-ledger/schema/ledger-purpose";
import { cn } from "@/lib/cn";

type ActivePermitStatusProps = {
  permits: (typeof ammoAcquisitionPermit.$inferSelect)[];
  ledgerPurpose: LedgerPurpose;
  permitBalance: number;
  today: string;
};

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

  if (purposePermits.length === 0 && permitBalance <= 0) {
    return (
      <div className="rounded-lg border border-amber-500/30 bg-amber-500/5 px-4 py-3 text-sm">
        <p className="font-medium text-amber-800 dark:text-amber-200">譲受許可が未登録です</p>
        <p className="mt-1 text-muted-foreground">
          許可残数を帳簿に出すには、
          <Link href="/lab/ammo-ledger/settings/permits" className="underline">
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
          <span className="text-muted-foreground">許可残数 </span>
          <span className="text-lg font-semibold tabular-nums">{permitBalance}発</span>
        </span>
        <span className="text-muted-foreground">
          {activePermits.length > 0 ? (
            <>
              有効な許可 {activePermits.length}件（{ledgerPurposeLabels[ledgerPurpose]}） ·{" "}
            </>
          ) : null}
          残り {permitBalance.toLocaleString("ja-JP")}発
        </span>
      </div>

      <ul className="flex flex-wrap gap-2">
        {purposePermits.map((permit) => {
          const active = isPermitActive({
            grantedOn: permit.grantedOn,
            expiresOn: permit.expiresOn,
            today,
          });
          const expiryLabel = formatPermitExpiryLabel({ expiresOn: permit.expiresOn, today });
          const urgent =
            active && computeDaysUntilExpiry({ expiresOn: permit.expiresOn, today }) <= 30;

          return (
            <li
              key={permit.id}
              className={cn(
                "rounded-lg border px-3 py-2 text-xs",
                active
                  ? urgent
                    ? "border-amber-500/40 bg-amber-500/5"
                    : "border-border/50 bg-muted/20"
                  : "border-border/30 bg-muted/10 text-muted-foreground",
              )}
            >
              <span className="font-medium">
                {permit.name} / {permit.permitPurpose}
              </span>
              <span className="mt-0.5 block tabular-nums">
                {permit.quantity.toLocaleString("ja-JP")}発 · {expiryLabel}
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
