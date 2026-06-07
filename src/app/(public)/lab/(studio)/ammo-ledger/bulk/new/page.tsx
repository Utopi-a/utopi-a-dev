import Link from "next/link";
import { requireAmmoUser } from "@/features/ammo-ledger/auth/require-ammo-user";
import { buildCounterpartyPickerData } from "@/features/ammo-ledger/catalog/build-counterparty-picker-data/build-counterparty-picker-data";
import { buildRangePickerData } from "@/features/ammo-ledger/catalog/build-range-picker-data/build-range-picker-data";
import { AmmoLedgerNav } from "@/features/ammo-ledger/components/ammo-ledger-nav/ammo-ledger-nav";
import { AmmoLedgerPanel } from "@/features/ammo-ledger/components/ammo-ledger-panel/ammo-ledger-panel";
import { BulkEntryForm } from "@/features/ammo-ledger/components/bulk-entry-form/bulk-entry-form";
import { listAmmoTypes } from "@/features/ammo-ledger/master/list-ammo-types/list-ammo-types";
import { listGuns } from "@/features/ammo-ledger/master/list-guns/list-guns";
import { manualCounterpartyId } from "@/features/ammo-ledger/schema/manual-counterparty-id";

export default async function BulkNewPage() {
  const user = await requireAmmoUser();

  const [guns, ammoTypes, rangePickerData, counterpartyPickerData] = await Promise.all([
    listGuns({ userId: user.id }),
    listAmmoTypes({ userId: user.id }),
    buildRangePickerData({ userId: user.id }),
    buildCounterpartyPickerData({ userId: user.id }),
  ]);

  const defaultCounterpartyId =
    counterpartyPickerData.recent[0]?.id ??
    counterpartyPickerData.registered[0]?.id ??
    manualCounterpartyId;

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
      <AmmoLedgerNav />
      <AmmoLedgerPanel>
        {guns.length === 0 || ammoTypes.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            銃・弾種のマスタを
            <Link href="/lab/ammo-ledger/settings" className="underline">
              設定
            </Link>
            から登録してください。
          </p>
        ) : (
          <BulkEntryForm
            guns={guns}
            ammoTypes={ammoTypes}
            rangePickerData={rangePickerData}
            counterpartyPickerData={counterpartyPickerData}
            defaultCounterpartyId={defaultCounterpartyId}
          />
        )}
      </AmmoLedgerPanel>
    </div>
  );
}
