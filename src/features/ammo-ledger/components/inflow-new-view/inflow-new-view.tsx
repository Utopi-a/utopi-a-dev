"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { AcquireForm } from "@/features/ammo-ledger/components/acquire-form/acquire-form";
import { AmmoLedgerPanel } from "@/features/ammo-ledger/components/ammo-ledger-panel/ammo-ledger-panel";
import { DisposeForm } from "@/features/ammo-ledger/components/dispose-form/dispose-form";
import {
  InflowRecordTabs,
  type InflowTab,
} from "@/features/ammo-ledger/components/inflow-record-tabs/inflow-record-tabs";
import { TransferForm } from "@/features/ammo-ledger/components/transfer-form/transfer-form";
import { WorkspaceViewLoader } from "@/features/ammo-ledger/components/workspace-view-loader/workspace-view-loader";
import { useDraftTransaction } from "@/features/ammo-ledger/transactions/get-draft/use-draft-transaction/use-draft-transaction";
import { deriveAmmoTypesFromWorkspace } from "@/features/ammo-ledger/workspace/derive-form-workspace-data/derive-form-workspace-data";
import { useAmmoLedgerWorkspace } from "@/features/ammo-ledger/workspace/use-ammo-ledger-workspace/use-ammo-ledger-workspace";

function parseTab(tab: string | null): InflowTab {
  if (tab === "dispose" || tab === "transfer") {
    return tab;
  }
  return "acquire";
}

export function InflowNewView() {
  const searchParams = useSearchParams();
  const draftId = searchParams.get("draft");
  const tab = parseTab(searchParams.get("tab"));
  const { workspace, isLoading: isWorkspaceLoading } = useAmmoLedgerWorkspace();
  const { draft, isLoading: isDraftLoading } = useDraftTransaction({ draftId });

  if (isWorkspaceLoading || isDraftLoading || !workspace) {
    return <WorkspaceViewLoader />;
  }

  const ammoTypes = deriveAmmoTypesFromWorkspace({ workspace });

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
      <AmmoLedgerPanel>
        {ammoTypes.length === 0 ? (
          emptyMasters
        ) : (
          <InflowRecordTabs
            key={`${tab}-${draftId ?? "new"}`}
            defaultTab={tab}
            acquireContent={
              <AcquireForm
                key={tab === "acquire" ? (draftId ?? "new") : "acquire"}
                ammoTypes={ammoTypes}
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
                initialValues={tab === "transfer" ? initialValues : undefined}
              />
            }
          />
        )}
      </AmmoLedgerPanel>
    </div>
  );
}
