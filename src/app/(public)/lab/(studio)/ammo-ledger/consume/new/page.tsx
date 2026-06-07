import Link from "next/link";
import { requireAmmoUser } from "@/features/ammo-ledger/auth/require-ammo-user";
import { buildRangePickerData } from "@/features/ammo-ledger/catalog/build-range-picker-data/build-range-picker-data";
import { AmmoLedgerNav } from "@/features/ammo-ledger/components/ammo-ledger-nav/ammo-ledger-nav";
import { AmmoLedgerPanel } from "@/features/ammo-ledger/components/ammo-ledger-panel/ammo-ledger-panel";
import { ConsumeForm } from "@/features/ammo-ledger/components/consume-form/consume-form";
import { listAmmoTypes } from "@/features/ammo-ledger/master/list-ammo-types/list-ammo-types";
import { listGuns } from "@/features/ammo-ledger/master/list-guns/list-guns";
import { getDraftTransaction } from "@/features/ammo-ledger/transactions/get-draft/get-draft";

type PageProps = {
  searchParams: Promise<{ draft?: string }>;
};

export default async function ConsumeNewPage({ searchParams }: PageProps) {
  const user = await requireAmmoUser();
  const { draft: draftId } = await searchParams;

  const [guns, ammoTypes, rangePickerData, draft] = await Promise.all([
    listGuns({ userId: user.id }),
    listAmmoTypes({ userId: user.id }),
    buildRangePickerData({ userId: user.id }),
    draftId ? getDraftTransaction({ userId: user.id, draftId }) : Promise.resolve(null),
  ]);

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
      </div>
      <AmmoLedgerNav />
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
          <ConsumeForm
            key={draftId ?? "new"}
            guns={guns}
            ammoTypes={ammoTypes}
            rangePickerData={rangePickerData}
            initialValues={initialValues}
          />
        )}
      </AmmoLedgerPanel>
    </div>
  );
}
