import { requireAmmoUser } from "@/features/ammo-ledger/auth/require-ammo-user";
import { AmmoLedgerNav } from "@/features/ammo-ledger/components/ammo-ledger-nav/ammo-ledger-nav";
import { AmmoLedgerPanel } from "@/features/ammo-ledger/components/ammo-ledger-panel/ammo-ledger-panel";
import { AmmoTypeForm } from "@/features/ammo-ledger/components/ammo-type-form/ammo-type-form";
import { AmmoTypeRowActions } from "@/features/ammo-ledger/components/ammo-type-row-actions/ammo-type-row-actions";
import { listAmmoTypes } from "@/features/ammo-ledger/master/list-ammo-types/list-ammo-types";
import type { ShotType } from "@/features/ammo-ledger/schema/shot-type";
import { shotTypeLabels } from "@/features/ammo-ledger/schema/shot-type";

export default async function AmmoTypesSettingsPage() {
  const user = await requireAmmoUser();
  const ammoTypes = await listAmmoTypes({ userId: user.id });

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold tracking-tight">弾種</h1>
      <AmmoLedgerNav />
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
                  {type.name} — {type.caliber} {shotTypeLabels[type.shotType as ShotType]}（1箱
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
