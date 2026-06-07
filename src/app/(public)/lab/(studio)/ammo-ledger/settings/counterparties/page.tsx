import { requireAmmoUser } from "@/features/ammo-ledger/auth/require-ammo-user";
import { AmmoLedgerNav } from "@/features/ammo-ledger/components/ammo-ledger-nav/ammo-ledger-nav";
import { AmmoLedgerPanel } from "@/features/ammo-ledger/components/ammo-ledger-panel/ammo-ledger-panel";
import { CatalogBrowsePromo } from "@/features/ammo-ledger/components/catalog-browse-promo/catalog-browse-promo";
import { CounterpartyForm } from "@/features/ammo-ledger/components/counterparty-form/counterparty-form";
import { CounterpartyRowActions } from "@/features/ammo-ledger/components/counterparty-row-actions/counterparty-row-actions";
import { listCounterparties } from "@/features/ammo-ledger/master/list-counterparties/list-counterparties";

export default async function CounterpartiesSettingsPage() {
  const user = await requireAmmoUser();
  const counterparties = await listCounterparties({ userId: user.id });

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h1 className="text-2xl font-semibold tracking-tight">購入先・譲渡先</h1>
        <p className="text-sm text-muted-foreground">よく使う購入先・譲渡先のマイリストです。</p>
      </div>
      <AmmoLedgerNav />
      <CatalogBrowsePromo
        href="/lab/ammo-ledger/settings/counterparties/catalog"
        title="全国の銃砲店一覧"
        description="検索・お気に入り登録・マイリストへの追加"
        countLabel="全国333件"
      />
      <AmmoLedgerPanel title="マイリスト">
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
                  {item.catalogId ? (
                    <span className="ml-2 text-xs text-muted-foreground">（全国一覧）</span>
                  ) : (
                    <span className="ml-2 text-xs text-muted-foreground">（手入力）</span>
                  )}
                </span>
                <CounterpartyRowActions counterpartyId={item.id} />
              </li>
            ))}
          </ul>
        )}
      </AmmoLedgerPanel>
      <AmmoLedgerPanel title="手入力で追加">
        <CounterpartyForm />
      </AmmoLedgerPanel>
    </div>
  );
}
