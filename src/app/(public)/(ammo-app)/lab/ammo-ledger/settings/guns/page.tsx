import { requireAmmoUser } from "@/features/ammo-ledger/auth/require-ammo-user";
import { AmmoLedgerPanel } from "@/features/ammo-ledger/components/ammo-ledger-panel/ammo-ledger-panel";
import { GunForm } from "@/features/ammo-ledger/components/gun-form/gun-form";
import { GunRowActions } from "@/features/ammo-ledger/components/gun-row-actions/gun-row-actions";
import { listGuns } from "@/features/ammo-ledger/master/list-guns/list-guns";

export default async function GunsSettingsPage() {
  const user = await requireAmmoUser();
  const guns = await listGuns({ userId: user.id });

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold tracking-tight">銃</h1>
      <AmmoLedgerPanel title="登録済み">
        {guns.length === 0 ? (
          <p className="text-sm text-muted-foreground">まだ登録がありません。</p>
        ) : (
          <ul className="divide-y divide-border/50 text-sm">
            {guns.map((gun) => (
              <li
                key={gun.id}
                className="flex items-start justify-between gap-4 py-3 first:pt-0 last:pb-0"
              >
                <span>
                  {gun.name} — {gun.gunNumber} / {gun.permitNumber}（{gun.gunType} / {gun.caliber}）
                </span>
                <GunRowActions gunId={gun.id} />
              </li>
            ))}
          </ul>
        )}
      </AmmoLedgerPanel>
      <AmmoLedgerPanel title="追加">
        <GunForm />
      </AmmoLedgerPanel>
    </div>
  );
}
