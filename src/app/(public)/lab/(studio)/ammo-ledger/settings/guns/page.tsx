import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { requireAmmoUser } from "@/features/ammo-ledger/auth/require-ammo-user";
import { AmmoLedgerNav } from "@/features/ammo-ledger/components/ammo-ledger-nav";
import { GunForm } from "@/features/ammo-ledger/components/gun-form/gun-form";
import { GunRowActions } from "@/features/ammo-ledger/components/gun-row-actions/gun-row-actions";
import { listGuns } from "@/features/ammo-ledger/master/list-guns/list-guns";

export default async function GunsSettingsPage() {
  const user = await requireAmmoUser();
  const guns = await listGuns({ userId: user.id });

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold tracking-tight">銃マスタ</h1>
      <AmmoLedgerNav />
      <Card className="border-border/70">
        <CardHeader>
          <CardTitle className="text-base">登録済み</CardTitle>
        </CardHeader>
        <CardContent>
          {guns.length === 0 ? (
            <p className="text-sm text-muted-foreground">まだ登録がありません。</p>
          ) : (
            <ul className="space-y-3 text-sm">
              {guns.map((gun) => (
                <li key={gun.id} className="flex items-start justify-between gap-4">
                  <span>
                    {gun.name} — {gun.permitNumber}（{gun.gunType} / {gun.caliber}）
                  </span>
                  <GunRowActions gunId={gun.id} />
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
      <Card className="border-border/70">
        <CardHeader>
          <CardTitle className="text-base">追加</CardTitle>
        </CardHeader>
        <CardContent>
          <GunForm />
        </CardContent>
      </Card>
    </div>
  );
}
