import Link from "next/link";
import { requireAmmoUser } from "@/features/ammo-ledger/auth/require-ammo-user";
import { BulkEntryFormLazy } from "@/features/ammo-ledger/components/bulk-entry-form/bulk-entry-form.lazy";
import { getInventorySummary } from "@/features/ammo-ledger/ledger/get-inventory-summary/get-inventory-summary";
import { buildStockByAmmoTypeId } from "@/features/ammo-ledger/master/build-stock-by-ammo-type-id/build-stock-by-ammo-type-id";
import { listAmmoTypes } from "@/features/ammo-ledger/master/list-ammo-types/list-ammo-types";
import { listGuns } from "@/features/ammo-ledger/master/list-guns/list-guns";

export default async function BulkNewPage() {
  const user = await requireAmmoUser();

  const [guns, ammoTypes, inventoryItems] = await Promise.all([
    listGuns({ userId: user.id }),
    listAmmoTypes({ userId: user.id }),
    getInventorySummary({ userId: user.id }),
  ]);

  const stockByAmmoTypeId = buildStockByAmmoTypeId({ inventoryItems });

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h1 className="text-2xl font-semibold tracking-tight">まとめて追加</h1>
        <p className="text-sm text-muted-foreground">
          消費と譲り受けを混ぜて、日付・弾・銃・用途の違う記録を一度に登録できます。
        </p>
        <p className="text-sm text-muted-foreground">
          1件だけ記録する場合は
          <Link href="/lab/ammo-ledger/consume/new" className="underline">
            消費した
          </Link>
          や
          <Link href="/lab/ammo-ledger/inflow/new" className="underline">
            譲り受けた
          </Link>
          から入力してください。
        </p>
      </div>
      {guns.length === 0 || ammoTypes.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          銃・弾種のマスタを
          <Link href="/lab/ammo-ledger/settings" className="underline">
            設定
          </Link>
          から登録してください。
        </p>
      ) : (
        <BulkEntryFormLazy
          guns={guns}
          ammoTypes={ammoTypes}
          stockByAmmoTypeId={stockByAmmoTypeId}
        />
      )}
    </div>
  );
}
