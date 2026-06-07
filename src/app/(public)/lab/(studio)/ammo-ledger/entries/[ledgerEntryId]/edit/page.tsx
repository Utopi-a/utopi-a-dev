import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAmmoUser } from "@/features/ammo-ledger/auth/require-ammo-user";
import { buildCounterpartyPickerData } from "@/features/ammo-ledger/catalog/build-counterparty-picker-data/build-counterparty-picker-data";
import { buildRangePickerData } from "@/features/ammo-ledger/catalog/build-range-picker-data/build-range-picker-data";
import { AcquireForm } from "@/features/ammo-ledger/components/acquire-form/acquire-form";
import { AmmoLedgerNav } from "@/features/ammo-ledger/components/ammo-ledger-nav/ammo-ledger-nav";
import { AmmoLedgerPanel } from "@/features/ammo-ledger/components/ammo-ledger-panel/ammo-ledger-panel";
import { ConsumeForm } from "@/features/ammo-ledger/components/consume-form/consume-form";
import { DisposeForm } from "@/features/ammo-ledger/components/dispose-form/dispose-form";
import { TransferForm } from "@/features/ammo-ledger/components/transfer-form/transfer-form";
import { listAmmoTypes } from "@/features/ammo-ledger/master/list-ammo-types/list-ammo-types";
import { listGuns } from "@/features/ammo-ledger/master/list-guns/list-guns";
import { ledgerCategoryLabels } from "@/features/ammo-ledger/schema/ledger-category";
import { getLedgerEntryForEdit } from "@/features/ammo-ledger/transactions/get-ledger-entry-for-edit/get-ledger-entry-for-edit";

type PageProps = {
  params: Promise<{ ledgerEntryId: string }>;
};

export default async function EditLedgerEntryPage({ params }: PageProps) {
  const user = await requireAmmoUser();
  const { ledgerEntryId } = await params;
  const editData = await getLedgerEntryForEdit({ userId: user.id, ledgerEntryId });

  if (!editData) {
    notFound();
  }

  const { inputKind, category, initialValues } = editData;
  const categoryLabel = ledgerCategoryLabels[category];

  const [guns, ammoTypes, rangePickerData, counterpartyPickerData] = await Promise.all([
    inputKind === "consume" ? listGuns({ userId: user.id }) : Promise.resolve([]),
    listAmmoTypes({ userId: user.id }),
    inputKind === "consume" ? buildRangePickerData({ userId: user.id }) : Promise.resolve(null),
    inputKind === "acquire" || inputKind === "transfer"
      ? buildCounterpartyPickerData({ userId: user.id })
      : Promise.resolve(null),
  ]);

  function renderForm() {
    switch (inputKind) {
      case "consume":
        if (guns.length === 0 || ammoTypes.length === 0 || !rangePickerData) {
          return (
            <p className="text-sm text-muted-foreground">
              銃・弾種のマスタを
              <Link href="/lab/ammo-ledger/settings" className="underline">
                設定
              </Link>
              から登録してください。
            </p>
          );
        }
        return (
          <ConsumeForm
            key={ledgerEntryId}
            ledgerEntryId={ledgerEntryId}
            guns={guns}
            ammoTypes={ammoTypes}
            rangePickerData={rangePickerData}
            initialValues={initialValues}
          />
        );
      case "acquire":
        if (ammoTypes.length === 0 || !counterpartyPickerData) {
          return (
            <p className="text-sm text-muted-foreground">
              弾種マスタを
              <Link href="/lab/ammo-ledger/settings/ammo-types" className="underline">
                登録
              </Link>
              してください。
            </p>
          );
        }
        return (
          <AcquireForm
            key={ledgerEntryId}
            ledgerEntryId={ledgerEntryId}
            ammoTypes={ammoTypes}
            counterpartyPickerData={counterpartyPickerData}
            initialValues={initialValues}
          />
        );
      case "dispose":
        if (ammoTypes.length === 0) {
          return (
            <p className="text-sm text-muted-foreground">
              弾種マスタを
              <Link href="/lab/ammo-ledger/settings/ammo-types" className="underline">
                登録
              </Link>
              してください。
            </p>
          );
        }
        return (
          <DisposeForm
            key={ledgerEntryId}
            ledgerEntryId={ledgerEntryId}
            ammoTypes={ammoTypes}
            initialValues={initialValues}
          />
        );
      case "transfer":
        if (ammoTypes.length === 0 || !counterpartyPickerData) {
          return (
            <p className="text-sm text-muted-foreground">
              弾種マスタを
              <Link href="/lab/ammo-ledger/settings/ammo-types" className="underline">
                登録
              </Link>
              してください。
            </p>
          );
        }
        return (
          <TransferForm
            key={ledgerEntryId}
            ledgerEntryId={ledgerEntryId}
            ammoTypes={ammoTypes}
            counterpartyPickerData={counterpartyPickerData}
            initialValues={initialValues}
          />
        );
    }
  }

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h1 className="text-2xl font-semibold tracking-tight">{categoryLabel}記録を編集</h1>
        <p className="text-sm text-muted-foreground">
          内容を直して更新できます。区分（{categoryLabel}）は変えられません。
        </p>
      </div>
      <AmmoLedgerNav />
      <AmmoLedgerPanel>{renderForm()}</AmmoLedgerPanel>
    </div>
  );
}
