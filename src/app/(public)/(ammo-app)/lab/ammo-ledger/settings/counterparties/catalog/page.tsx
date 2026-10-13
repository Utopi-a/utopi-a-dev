import Link from "next/link";
import { requireAmmoUser } from "@/features/ammo-ledger/auth/require-ammo-user";
import { buildCounterpartyPickerData } from "@/features/ammo-ledger/catalog/build-counterparty-picker-data/build-counterparty-picker-data";
import { CatalogList } from "@/features/ammo-ledger/components/catalog-list/catalog-list";

export const metadata = { title: "全国の銃砲店・射撃場一覧" };

export default async function CounterpartyCatalogPage() {
  const user = await requireAmmoUser();
  const pickerData = await buildCounterpartyPickerData({
    userId: user.id,
    includeRangeCatalog: true,
  });

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
          <h1 className="text-2xl font-semibold tracking-tight">全国の銃砲店・射撃場一覧</h1>
          <p className="text-sm text-muted-foreground">
            銃砲店は日本ライフル射撃協会の認定販売店リスト、射撃場は射撃場協会の一覧をもとにしています。
          </p>
        </div>
      </div>
      <CatalogList
        catalogKind="gun_shop"
        catalogByPrefecture={pickerData.catalogByPrefecture}
        favoriteCatalogIds={pickerData.favoriteCatalogIds}
        // ピッカー用の registeredCatalogIds は射撃場マイリストも含む。この一覧の追加・削除は
        // 購入先に対して行うため、購入先として登録済みのものだけを登録済みとして扱う。
        registeredCatalogIds={Object.keys(pickerData.counterpartyIdByCatalogId ?? {})}
        includesRangeCatalog
      />
    </>
  );
}
