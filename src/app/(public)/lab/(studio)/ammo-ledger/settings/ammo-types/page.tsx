import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { requireAmmoUser } from "@/features/ammo-ledger/auth/require-ammo-user";
import { AmmoLedgerNav } from "@/features/ammo-ledger/components/ammo-ledger-nav";
import { AmmoTypeForm } from "@/features/ammo-ledger/components/ammo-type-form/ammo-type-form";
import { MasterRowActions } from "@/features/ammo-ledger/components/master-row-actions/master-row-actions";
import { deleteAmmoTypeAction } from "@/features/ammo-ledger/master/delete-ammo-type/delete-ammo-type-action";
import { listAmmoTypes } from "@/features/ammo-ledger/master/list-ammo-types/list-ammo-types";
import type { ShotType } from "@/features/ammo-ledger/schema/shot-type";
import { shotTypeLabels } from "@/features/ammo-ledger/schema/shot-type";

export default async function AmmoTypesSettingsPage() {
  const user = await requireAmmoUser();
  const ammoTypes = await listAmmoTypes({ userId: user.id });

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold tracking-tight">弾種マスタ</h1>
      <AmmoLedgerNav />
      <Card className="border-border/70">
        <CardHeader>
          <CardTitle className="text-base">登録済み</CardTitle>
        </CardHeader>
        <CardContent>
          {ammoTypes.length === 0 ? (
            <p className="text-sm text-muted-foreground">まだ登録がありません。</p>
          ) : (
            <ul className="space-y-3 text-sm">
              {ammoTypes.map((type) => (
                <li key={type.id} className="flex items-start justify-between gap-4">
                  <span>
                    {type.name}
                    {type.gaugeNumber ? `（${type.gaugeNumber}号）` : ""} — {type.caliber}{" "}
                    {shotTypeLabels[type.shotType as ShotType]}（1箱{type.roundsPerBox}発）
                  </span>
                  <MasterRowActions
                    editHref={`/lab/ammo-ledger/settings/ammo-types/${type.id}/edit`}
                    onDelete={() => deleteAmmoTypeAction({ id: type.id })}
                  />
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
          <AmmoTypeForm />
        </CardContent>
      </Card>
    </div>
  );
}
