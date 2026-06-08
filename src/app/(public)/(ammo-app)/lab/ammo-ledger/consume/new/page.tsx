import Link from "next/link";
import { requireAmmoUser } from "@/features/ammo-ledger/auth/require-ammo-user";
import { AmmoLedgerPanel } from "@/features/ammo-ledger/components/ammo-ledger-panel/ammo-ledger-panel";
import { ConsumeFormLazy } from "@/features/ammo-ledger/components/consume-form/consume-form.lazy";
import { getInventorySummary } from "@/features/ammo-ledger/ledger/get-inventory-summary/get-inventory-summary";
import { buildStockByAmmoTypeId } from "@/features/ammo-ledger/master/build-stock-by-ammo-type-id/build-stock-by-ammo-type-id";
import { listAmmoTypes } from "@/features/ammo-ledger/master/list-ammo-types/list-ammo-types";
import { listGuns } from "@/features/ammo-ledger/master/list-guns/list-guns";
import { getDraftTransaction } from "@/features/ammo-ledger/transactions/get-draft/get-draft";

type PageProps = {
  searchParams: Promise<{ draft?: string }>;
};

export default async function ConsumeNewPage({ searchParams }: PageProps) {
  const user = await requireAmmoUser();
  const { draft: draftId } = await searchParams;

  const [guns, ammoTypes, inventoryItems, draft] = await Promise.all([
    listGuns({ userId: user.id }),
    listAmmoTypes({ userId: user.id }),
    getInventorySummary({ userId: user.id }),
    draftId ? getDraftTransaction({ userId: user.id, draftId }) : Promise.resolve(null),
  ]);

  const stockByAmmoTypeId = buildStockByAmmoTypeId({ inventoryItems });

  const initialValues = draft
    ? {
        occurredOn: draft.occurredOn,
        ammoTypeId: draft.ammoTypeId ?? undefined,
        boxCount: draft.boxCount,
        looseRounds: draft.looseRounds,
      }
    : undefined;

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h1 className="text-2xl font-semibold tracking-tight">消費した</h1>
        <p className="text-sm text-muted-foreground">
          箱数・バラで入力できます。帳簿には消費の発数のみ記録されます。
        </p>
        <p className="text-sm text-muted-foreground">
          複数の記録を一度に入力する場合は
          <Link href="/lab/ammo-ledger/bulk/new" className="underline">
            まとめて追加
          </Link>
          をご利用ください。
        </p>
      </div>
      <AmmoLedgerPanel>
        {guns.length === 0 || ammoTypes.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            銃・弾種のマスタを
            <Link href="/lab/ammo-ledger/settings" className="underline">
              設定
            </Link>
            から登録してください。射撃場は入力時に全国一覧から選べます。
          </p>
        ) : (
          <ConsumeFormLazy
            key={draftId ?? "new"}
            guns={guns}
            ammoTypes={ammoTypes}
            stockByAmmoTypeId={stockByAmmoTypeId}
            initialValues={initialValues}
          />
        )}
      </AmmoLedgerPanel>
    </div>
  );
}
