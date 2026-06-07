import { requireAmmoUser } from "@/features/ammo-ledger/auth/require-ammo-user";
import { AcquisitionPermitForm } from "@/features/ammo-ledger/components/acquisition-permit-form/acquisition-permit-form";
import { AcquisitionPermitRowActions } from "@/features/ammo-ledger/components/acquisition-permit-row-actions/acquisition-permit-row-actions";
import { AmmoLedgerNav } from "@/features/ammo-ledger/components/ammo-ledger-nav/ammo-ledger-nav";
import { AmmoLedgerPanel } from "@/features/ammo-ledger/components/ammo-ledger-panel/ammo-ledger-panel";
import { formatPermitExpiryLabel } from "@/features/ammo-ledger/permit/compute-permit-expiry/compute-permit-expiry";
import { listAcquisitionPermits } from "@/features/ammo-ledger/permit/list-acquisition-permits/list-acquisition-permits";
import type { LedgerPurpose } from "@/features/ammo-ledger/schema/ledger-purpose";
import { ledgerPurposeLabels } from "@/features/ammo-ledger/schema/ledger-purpose";

export default async function AcquisitionPermitsSettingsPage() {
  const user = await requireAmmoUser();
  const permits = await listAcquisitionPermits({ userId: user.id });
  const today = new Date().toISOString().slice(0, 10);

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h1 className="text-2xl font-semibold tracking-tight">譲受許可</h1>
        <p className="text-sm text-muted-foreground">
          警察から交付された譲受許可を登録します。帳簿の許可残数計算に使われます。
        </p>
      </div>
      <AmmoLedgerNav />

      <AmmoLedgerPanel title="登録済み">
        {permits.length === 0 ? (
          <p className="text-sm text-muted-foreground">まだ登録がありません。</p>
        ) : (
          <ul className="divide-y divide-border/50 text-sm">
            {permits.map((permit) => (
              <li
                key={permit.id}
                className="flex items-start justify-between gap-4 py-3 first:pt-0 last:pb-0"
              >
                <span>
                  <span className="font-medium">
                    {permit.name} — {permit.permitPurpose}
                  </span>
                  <span className="mt-0.5 block text-muted-foreground">
                    {ledgerPurposeLabels[permit.ledgerPurpose as LedgerPurpose]} / 付与{" "}
                    {permit.grantedOn} / {permit.quantity.toLocaleString("ja-JP")}発 /{" "}
                    {formatPermitExpiryLabel({ expiresOn: permit.expiresOn, today })}
                  </span>
                </span>
                <AcquisitionPermitRowActions permitId={permit.id} />
              </li>
            ))}
          </ul>
        )}
      </AmmoLedgerPanel>

      <AmmoLedgerPanel title="許可を追加">
        <AcquisitionPermitForm />
      </AmmoLedgerPanel>
    </div>
  );
}
