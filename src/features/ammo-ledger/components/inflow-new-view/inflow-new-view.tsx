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
import { IssueForm } from "@/features/ammo-ledger/components/issue-form/issue-form";
import { ManufactureForm } from "@/features/ammo-ledger/components/manufacture-form/manufacture-form";
import { MissingMastersNotice } from "@/features/ammo-ledger/components/missing-masters-notice/missing-masters-notice";
import { ReceiveForm } from "@/features/ammo-ledger/components/receive-form/receive-form";
import { TransferForm } from "@/features/ammo-ledger/components/transfer-form/transfer-form";
import { WorkspaceViewLoader } from "@/features/ammo-ledger/components/workspace-view-loader/workspace-view-loader";
import { useDraftTransaction } from "@/features/ammo-ledger/transactions/get-draft/use-draft-transaction/use-draft-transaction";
import { resolveAmmoTypeDefaults } from "@/features/ammo-ledger/transactions/resolve-ammo-type-defaults/resolve-ammo-type-defaults";
import { deriveFormWorkspaceData } from "@/features/ammo-ledger/workspace/derive-form-workspace-data/derive-form-workspace-data";
import { useAmmoLedgerWorkspace } from "@/features/ammo-ledger/workspace/use-ammo-ledger-workspace/use-ammo-ledger-workspace";

const inflowPath = "/lab/ammo-ledger/inflow/new";

const inflowTabs: InflowTab[] = [
  "acquire",
  "dispose",
  "transfer",
  "manufacture",
  "issue",
  "receive",
];

function parseTab(tab: string | null): InflowTab {
  if (tab && inflowTabs.includes(tab as InflowTab)) {
    return tab as InflowTab;
  }
  return "acquire";
}

export function InflowNewView() {
  const searchParams = useSearchParams();
  const draftId = searchParams.get("draft");
  // 保存できなかった入力に戻るたびにフォームを作り直し、その入力値で始める。
  const restoreId = searchParams.get("restore");
  const tab = parseTab(searchParams.get("tab"));
  const { workspace, isLoading: isWorkspaceLoading, error, retry } = useAmmoLedgerWorkspace();
  const {
    draft,
    isLoading: isDraftLoading,
    error: draftError,
    retry: retryDraft,
  } = useDraftTransaction({ draftId });

  if (isWorkspaceLoading || isDraftLoading || !workspace || draftError) {
    return <WorkspaceViewLoader error={error ?? draftError} onRetry={error ? retry : retryDraft} />;
  }

  const { ammoTypes, stockByAmmoTypeId } = deriveFormWorkspaceData({ workspace });

  const entries = workspace.entries;
  // 下書きは開いたタブに入れ、ほかは同じ区分の前回の記録から弾と用途を初期値にする。
  function initialValuesFor({ formTab }: { formTab: InflowTab }) {
    if (draft && formTab === tab) {
      return {
        occurredOn: draft.occurredOn,
        ammoTypeId: draft.ammoTypeId ?? undefined,
        boxCount: draft.boxCount,
        looseRounds: draft.looseRounds,
      };
    }
    const { ammoTypeId, purpose } = resolveAmmoTypeDefaults({
      entries,
      category: formTab,
      ammoTypes,
    });
    return { ammoTypeId, purpose };
  }

  const hasPermits = workspace.permits.length > 0;

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
          <MissingMastersNotice
            action="譲り受けを記録する"
            missing={hasPermits ? ["ammo-type"] : ["ammo-type", "permit"]}
            returnTo={inflowPath}
          />
        ) : (
          <InflowRecordTabs
            key={`${draftId ?? "new"}:${restoreId ?? ""}`}
            defaultTab={tab}
            acquireContent={
              hasPermits ? (
                <AcquireForm
                  ammoTypes={ammoTypes}
                  stockByAmmoTypeId={stockByAmmoTypeId}
                  permits={workspace.permits}
                  initialValues={initialValuesFor({ formTab: "acquire" })}
                />
              ) : (
                // 有効な許可がないと保存できないため、入力させる前に登録へ案内する。
                <MissingMastersNotice
                  action="譲り受けを記録する"
                  missing={["permit"]}
                  returnTo={inflowPath}
                />
              )
            }
            disposeContent={
              <DisposeForm
                ammoTypes={ammoTypes}
                stockByAmmoTypeId={stockByAmmoTypeId}
                initialValues={initialValuesFor({ formTab: "dispose" })}
              />
            }
            transferContent={
              <TransferForm
                ammoTypes={ammoTypes}
                stockByAmmoTypeId={stockByAmmoTypeId}
                initialValues={initialValuesFor({ formTab: "transfer" })}
              />
            }
            manufactureContent={
              <ManufactureForm
                ammoTypes={ammoTypes}
                stockByAmmoTypeId={stockByAmmoTypeId}
                initialValues={initialValuesFor({ formTab: "manufacture" })}
              />
            }
            issueContent={
              <IssueForm
                ammoTypes={ammoTypes}
                stockByAmmoTypeId={stockByAmmoTypeId}
                initialValues={initialValuesFor({ formTab: "issue" })}
              />
            }
            receiveContent={
              <ReceiveForm
                ammoTypes={ammoTypes}
                stockByAmmoTypeId={stockByAmmoTypeId}
                initialValues={initialValuesFor({ formTab: "receive" })}
              />
            }
          />
        )}
      </AmmoLedgerPanel>
    </div>
  );
}
