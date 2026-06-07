import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { requireAmmoUser } from "@/features/ammo-ledger/auth/require-ammo-user";
import { AmmoLedgerNav } from "@/features/ammo-ledger/components/ammo-ledger-nav";
import { CounterpartyForm } from "@/features/ammo-ledger/components/counterparty-form/counterparty-form";
import { MasterRowActions } from "@/features/ammo-ledger/components/master-row-actions/master-row-actions";
import { deleteCounterpartyAction } from "@/features/ammo-ledger/master/delete-counterparty/delete-counterparty-action";
import { listCounterparties } from "@/features/ammo-ledger/master/list-counterparties/list-counterparties";

export default async function CounterpartiesSettingsPage() {
  const user = await requireAmmoUser();
  const counterparties = await listCounterparties({ userId: user.id });

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold tracking-tight">購入先マスタ</h1>
      <AmmoLedgerNav />
      <Card className="border-border/70">
        <CardHeader>
          <CardTitle className="text-base">登録済み</CardTitle>
        </CardHeader>
        <CardContent>
          {counterparties.length === 0 ? (
            <p className="text-sm text-muted-foreground">まだ登録がありません。</p>
          ) : (
            <ul className="space-y-3 text-sm">
              {counterparties.map((item) => (
                <li key={item.id} className="flex items-start justify-between gap-4">
                  <span>
                    {item.name} — {item.address}
                  </span>
                  <MasterRowActions
                    editHref={`/lab/ammo-ledger/settings/counterparties/${item.id}/edit`}
                    onDelete={() => deleteCounterpartyAction({ id: item.id })}
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
          <CounterpartyForm />
        </CardContent>
      </Card>
    </div>
  );
}
