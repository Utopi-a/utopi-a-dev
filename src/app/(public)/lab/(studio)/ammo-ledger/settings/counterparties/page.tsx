import { requireAmmoUser } from "@/features/ammo-ledger/auth/require-ammo-user";
import { AmmoLedgerNav } from "@/features/ammo-ledger/components/ammo-ledger-nav/ammo-ledger-nav";
import { AmmoLedgerPanel } from "@/features/ammo-ledger/components/ammo-ledger-panel/ammo-ledger-panel";
import { CounterpartyForm } from "@/features/ammo-ledger/components/counterparty-form/counterparty-form";
import { CounterpartyRowActions } from "@/features/ammo-ledger/components/counterparty-row-actions/counterparty-row-actions";
import { listCounterparties } from "@/features/ammo-ledger/master/list-counterparties/list-counterparties";

export default async function CounterpartiesSettingsPage() {
  const user = await requireAmmoUser();
  const counterparties = await listCounterparties({ userId: user.id });

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold tracking-tight">購入先・譲渡先</h1>
      <AmmoLedgerNav />
      <AmmoLedgerPanel title="登録済み">
        {counterparties.length === 0 ? (
          <p className="text-sm text-muted-foreground">まだ登録がありません。</p>
        ) : (
          <ul className="divide-y divide-border/50 text-sm">
            {counterparties.map((item) => (
              <li
                key={item.id}
                className="flex items-start justify-between gap-4 py-3 first:pt-0 last:pb-0"
              >
                <span>
                  {item.name} — {item.address}
                </span>
                <CounterpartyRowActions counterpartyId={item.id} />
              </li>
            ))}
          </ul>
        )}
      </AmmoLedgerPanel>
      <AmmoLedgerPanel title="追加">
        <CounterpartyForm />
      </AmmoLedgerPanel>
    </div>
  );
}
