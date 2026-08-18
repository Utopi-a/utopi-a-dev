import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { requireAmmoUser } from "@/features/ammo-ledger/auth/require-ammo-user";
import { AcquireForm } from "@/features/ammo-ledger/components/acquire-form/acquire-form";
import { AmmoLedgerPanel } from "@/features/ammo-ledger/components/ammo-ledger-panel/ammo-ledger-panel";
import { ConsumeFormLazy } from "@/features/ammo-ledger/components/consume-form/consume-form.lazy";
import { DisposeForm } from "@/features/ammo-ledger/components/dispose-form/dispose-form";
import { IssueForm } from "@/features/ammo-ledger/components/issue-form/issue-form";
import { ManufactureForm } from "@/features/ammo-ledger/components/manufacture-form/manufacture-form";
import { ReceiveForm } from "@/features/ammo-ledger/components/receive-form/receive-form";
import { TransferForm } from "@/features/ammo-ledger/components/transfer-form/transfer-form";
import { getInventorySummary } from "@/features/ammo-ledger/ledger/get-inventory-summary/get-inventory-summary";
import { checkDatesAgainstLock } from "@/features/ammo-ledger/ledger/lock/check-dates-against-lock/check-dates-against-lock";
import { getLatestLockState } from "@/features/ammo-ledger/ledger/lock/get-latest-lock-state/get-latest-lock-state";
import { buildStockByAmmoTypeId } from "@/features/ammo-ledger/master/build-stock-by-ammo-type-id/build-stock-by-ammo-type-id";
import { listAmmoTypes } from "@/features/ammo-ledger/master/list-ammo-types/list-ammo-types";
import { listGuns } from "@/features/ammo-ledger/master/list-guns/list-guns";
import { listAcquisitionPermits } from "@/features/ammo-ledger/permit/list-acquisition-permits/list-acquisition-permits";
import { ledgerCategoryLabels } from "@/features/ammo-ledger/schema/ledger-category";
import { buildConsumeEditStock } from "@/features/ammo-ledger/transactions/build-consume-edit-stock/build-consume-edit-stock";
import { getLedgerEntryForEdit } from "@/features/ammo-ledger/transactions/get-ledger-entry-for-edit/get-ledger-entry-for-edit";

type PageProps = {
  params: Promise<{ ledgerEntryId: string }>;
};

export default async function EditLedgerEntryPage({ params }: PageProps) {
  const user = await requireAmmoUser();
  const { ledgerEntryId } = await params;
  const editData = await getLedgerEntryForEdit({ userId: user.id, ledgerEntryId });

  if (!editData) {
    return notFound();
  }

  const lockState = await getLatestLockState({ userId: user.id });
  const lockResult = checkDatesAgainstLock({
    lockState,
    dates: [editData.initialValues.occurredOn],
  });
  if (lockResult.blocked) {
    return redirect("/lab/ammo-ledger/ledger");
  }

  const { inputKind, category, initialValues } = editData;
  const categoryLabel = ledgerCategoryLabels[category];

  const [guns, ammoTypes, inventoryItems, permits] = await Promise.all([
    inputKind === "consume" ? listGuns({ userId: user.id }) : Promise.resolve([]),
    listAmmoTypes({ userId: user.id }),
    inputKind === "consume" ? getInventorySummary({ userId: user.id }) : Promise.resolve([]),
    inputKind === "acquire" ? listAcquisitionPermits({ userId: user.id }) : Promise.resolve([]),
  ]);

  const stockByAmmoTypeId =
    inputKind === "consume"
      ? buildConsumeEditStock({
          bookStockByAmmoTypeId: buildStockByAmmoTypeId({ inventoryItems }),
          originalAmmoTypeId: initialValues.ammoTypeId,
          originalQuantity: initialValues.originalQuantity,
        })
      : {};

  const emptyAmmoTypeMessage = (
    <p className="text-sm text-muted-foreground">
      弾種マスタを
      <Link href="/lab/ammo-ledger/settings/ammo-types" className="underline">
        登録
      </Link>
      してください。
    </p>
  );

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
        if (ammoTypes.length === 0) return emptyAmmoTypeMessage;
        return (
          <AcquireForm
            key={ledgerEntryId}
            ledgerEntryId={ledgerEntryId}
            ammoTypes={ammoTypes}
            permits={permits}
            initialValues={initialValues}
          />
        );
      case "dispose":
        if (ammoTypes.length === 0) return emptyAmmoTypeMessage;
        return (
          <DisposeForm
            key={ledgerEntryId}
            ledgerEntryId={ledgerEntryId}
            ammoTypes={ammoTypes}
            initialValues={initialValues}
          />
        );
      case "transfer":
        if (ammoTypes.length === 0) return emptyAmmoTypeMessage;
        return (
          <TransferForm
            key={ledgerEntryId}
            ledgerEntryId={ledgerEntryId}
            ammoTypes={ammoTypes}
            initialValues={initialValues}
          />
        );
      case "manufacture":
        if (ammoTypes.length === 0) return emptyAmmoTypeMessage;
        return (
          <ManufactureForm
            key={ledgerEntryId}
            ledgerEntryId={ledgerEntryId}
            ammoTypes={ammoTypes}
            initialValues={initialValues}
          />
        );
      case "issue":
        if (ammoTypes.length === 0) return emptyAmmoTypeMessage;
        return (
          <IssueForm
            key={ledgerEntryId}
            ledgerEntryId={ledgerEntryId}
            ammoTypes={ammoTypes}
            initialValues={initialValues}
          />
        );
      case "receive":
        if (ammoTypes.length === 0) return emptyAmmoTypeMessage;
        return (
          <ReceiveForm
            key={ledgerEntryId}
            ledgerEntryId={ledgerEntryId}
            ammoTypes={ammoTypes}
            initialValues={initialValues}
          />
        );
      case "stock_check":
        return null;
      default: {
        const _exhaustive: never = inputKind;
        return _exhaustive;
      }
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
