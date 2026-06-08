import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAmmoUser } from "@/features/ammo-ledger/auth/require-ammo-user";
import { AcquireForm } from "@/features/ammo-ledger/components/acquire-form/acquire-form";
import { AmmoLedgerPanel } from "@/features/ammo-ledger/components/ammo-ledger-panel/ammo-ledger-panel";
import { ConsumeFormLazy } from "@/features/ammo-ledger/components/consume-form/consume-form.lazy";
import { DisposeForm } from "@/features/ammo-ledger/components/dispose-form/dispose-form";
import { TransferForm } from "@/features/ammo-ledger/components/transfer-form/transfer-form";
import { getInventorySummary } from "@/features/ammo-ledger/ledger/get-inventory-summary/get-inventory-summary";
import { buildStockByAmmoTypeId } from "@/features/ammo-ledger/master/build-stock-by-ammo-type-id/build-stock-by-ammo-type-id";
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

  const [guns, ammoTypes, inventoryItems] = await Promise.all([
    inputKind === "consume" ? listGuns({ userId: user.id }) : Promise.resolve([]),
    listAmmoTypes({ userId: user.id }),
    inputKind === "consume" ? getInventorySummary({ userId: user.id }) : Promise.resolve([]),
  ]);

  const stockByAmmoTypeId =
    inputKind === "consume" ? buildStockByAmmoTypeId({ inventoryItems }) : {};

  function renderForm() {
    switch (inputKind) {
      case "consume":
        if (guns.length === 0 || ammoTypes.length === 0) {
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
          <ConsumeFormLazy
            key={ledgerEntryId}
            ledgerEntryId={ledgerEntryId}
            guns={guns}
            ammoTypes={ammoTypes}
            stockByAmmoTypeId={stockByAmmoTypeId}
            initialValues={initialValues}
          />
        );
      case "acquire":
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
          <AcquireForm
            key={ledgerEntryId}
            ledgerEntryId={ledgerEntryId}
            ammoTypes={ammoTypes}
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
          <TransferForm
            key={ledgerEntryId}
            ledgerEntryId={ledgerEntryId}
            ammoTypes={ammoTypes}
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
      <AmmoLedgerPanel>{renderForm()}</AmmoLedgerPanel>
    </div>
  );
}
