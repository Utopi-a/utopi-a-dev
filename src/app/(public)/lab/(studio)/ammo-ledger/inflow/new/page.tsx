import Link from "next/link";
import { Suspense } from "react";
import { requireAmmoUser } from "@/features/ammo-ledger/auth/require-ammo-user";
import { buildCounterpartyPickerData } from "@/features/ammo-ledger/catalog/build-counterparty-picker-data/build-counterparty-picker-data";
import { AcquireForm } from "@/features/ammo-ledger/components/acquire-form/acquire-form";
import { AmmoLedgerNav } from "@/features/ammo-ledger/components/ammo-ledger-nav/ammo-ledger-nav";
import { AmmoLedgerPanel } from "@/features/ammo-ledger/components/ammo-ledger-panel/ammo-ledger-panel";
import { DisposeForm } from "@/features/ammo-ledger/components/dispose-form/dispose-form";
import {
  InflowRecordTabs,
  type InflowTab,
} from "@/features/ammo-ledger/components/inflow-record-tabs/inflow-record-tabs";
import { TransferForm } from "@/features/ammo-ledger/components/transfer-form/transfer-form";
import { listAmmoTypes } from "@/features/ammo-ledger/master/list-ammo-types/list-ammo-types";
import { getDraftTransaction } from "@/features/ammo-ledger/transactions/get-draft/get-draft";

type PageProps = {
  searchParams: Promise<{ tab?: string; draft?: string }>;
};

function parseTab(tab: string | undefined): InflowTab {
  if (tab === "dispose" || tab === "transfer") {
    return tab;
  }
  return "acquire";
}

export default async function InflowNewPage({ searchParams }: PageProps) {
  const user = await requireAmmoUser();
  const { tab: tabParam, draft: draftId } = await searchParams;
  const tab = parseTab(tabParam);

  const [ammoTypes, counterpartyPickerData, draft] = await Promise.all([
    listAmmoTypes({ userId: user.id }),
    buildCounterpartyPickerData({ userId: user.id }),
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

  const emptyMasters = (
    <p className="text-sm text-muted-foreground">
      弾種マスタを
      <Link href="/lab/ammo-ledger/settings/ammo-types" className="underline">
        登録
      </Link>
      してください。
    </p>
  );

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h1 className="text-2xl font-semibold tracking-tight">入庫・出庫の記録</h1>
        <p className="text-sm text-muted-foreground">
          譲り受けが主な操作です。廃棄・譲渡はタブから切り替えられます。
        </p>
        <p className="text-sm text-muted-foreground">
          複数の記録を一度に入力する場合は
          <Link href="/lab/ammo-ledger/bulk/new" className="underline">
            まとめて追加
          </Link>
          をご利用ください。
        </p>
      </div>
      <AmmoLedgerNav />
      <AmmoLedgerPanel>
        {ammoTypes.length === 0 ? (
          emptyMasters
        ) : (
          <Suspense fallback={<p className="text-sm text-muted-foreground">読み込み中…</p>}>
            <InflowRecordTabs
              key={`${tab}-${draftId ?? "new"}`}
              defaultTab={tab}
              acquireContent={
                <AcquireForm
                  key={tab === "acquire" ? (draftId ?? "new") : "acquire"}
                  ammoTypes={ammoTypes}
                  counterpartyPickerData={counterpartyPickerData}
                  initialValues={tab === "acquire" ? initialValues : undefined}
                />
              }
              disposeContent={
                <DisposeForm
                  key={tab === "dispose" ? (draftId ?? "new") : "dispose"}
                  ammoTypes={ammoTypes}
                  initialValues={tab === "dispose" ? initialValues : undefined}
                />
              }
              transferContent={
                <TransferForm
                  key={tab === "transfer" ? (draftId ?? "new") : "transfer"}
                  ammoTypes={ammoTypes}
                  counterpartyPickerData={counterpartyPickerData}
                  initialValues={tab === "transfer" ? initialValues : undefined}
                />
              }
            />
          </Suspense>
        )}
      </AmmoLedgerPanel>
    </div>
  );
}
