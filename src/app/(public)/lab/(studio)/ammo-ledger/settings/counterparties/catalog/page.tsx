import Link from "next/link";
import { requireAmmoUser } from "@/features/ammo-ledger/auth/require-ammo-user";
import { buildCounterpartyPickerData } from "@/features/ammo-ledger/catalog/build-counterparty-picker-data/build-counterparty-picker-data";
import { AmmoLedgerNav } from "@/features/ammo-ledger/components/ammo-ledger-nav/ammo-ledger-nav";
import { CatalogList } from "@/features/ammo-ledger/components/catalog-list/catalog-list";

export default async function CounterpartyCatalogPage() {
  const user = await requireAmmoUser();
  const pickerData = await buildCounterpartyPickerData({ userId: user.id });

  return (
    <>
      <div className="space-y-2 pb-2" data-catalog-page-header>
        <p className="text-sm">
          <Link
            href="/lab/ammo-ledger/settings/counterparties"
            className="text-muted-foreground underline"
          >
            購入先・譲渡先
          </Link>
        </p>
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight">全国の銃砲店一覧</h1>
          <p className="text-sm text-muted-foreground">
            日本ライフル射撃協会の認定販売店リストをもとにしています。
          </p>
        </div>
        <AmmoLedgerNav />
      </div>
      <CatalogList
        catalogKind="gun_shop"
        catalogByPrefecture={pickerData.catalogByPrefecture}
        favoriteCatalogIds={pickerData.favoriteCatalogIds}
        registeredCatalogIds={pickerData.registeredCatalogIds}
      />
    </>
  );
}
