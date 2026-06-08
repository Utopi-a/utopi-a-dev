import Link from "next/link";
import { requireAmmoUser } from "@/features/ammo-ledger/auth/require-ammo-user";
import { buildRangePickerData } from "@/features/ammo-ledger/catalog/build-range-picker-data/build-range-picker-data";
import { CatalogList } from "@/features/ammo-ledger/components/catalog-list/catalog-list";

export default async function RangeCatalogPage() {
  const user = await requireAmmoUser();
  const pickerData = await buildRangePickerData({ userId: user.id });

  return (
    <>
      <div className="space-y-2 pb-2" data-catalog-page-header>
        <p className="text-sm">
          <Link href="/lab/ammo-ledger/settings/ranges" className="text-muted-foreground underline">
            射撃場
          </Link>
        </p>
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight">全国の射撃場一覧</h1>
          <p className="text-sm text-muted-foreground">
            全国指定射撃場協会のデータをもとにしています。
          </p>
        </div>
      </div>
      <CatalogList
        catalogKind="range"
        catalogByPrefecture={pickerData.catalogByPrefecture}
        favoriteCatalogIds={pickerData.favoriteCatalogIds}
        registeredCatalogIds={pickerData.registeredCatalogIds}
      />
    </>
  );
}
