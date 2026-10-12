"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { AmmoLedgerPanel } from "@/features/ammo-ledger/components/ammo-ledger-panel/ammo-ledger-panel";
import { ConsumeForm } from "@/features/ammo-ledger/components/consume-form/consume-form";
import { WorkspaceViewLoader } from "@/features/ammo-ledger/components/workspace-view-loader/workspace-view-loader";
import { useDraftTransaction } from "@/features/ammo-ledger/transactions/get-draft/use-draft-transaction/use-draft-transaction";
import { resolveConsumeDefaults } from "@/features/ammo-ledger/transactions/resolve-consume-defaults/resolve-consume-defaults";
import { deriveFormWorkspaceData } from "@/features/ammo-ledger/workspace/derive-form-workspace-data/derive-form-workspace-data";
import { useAmmoLedgerWorkspace } from "@/features/ammo-ledger/workspace/use-ammo-ledger-workspace/use-ammo-ledger-workspace";

export function ConsumeNewView() {
  const searchParams = useSearchParams();
  const draftId = searchParams.get("draft");
  // 保存できなかった入力に戻るたびにフォームを作り直し、その入力値で始める。
  const restoreId = searchParams.get("restore");
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

  const { guns, ammoTypes, stockByAmmoTypeId } = deriveFormWorkspaceData({ workspace });
  const { fromPreviousEntry, ...defaults } = resolveConsumeDefaults({
    entries: workspace.entries,
    gunIds: guns.map((gun) => gun.id),
    ammoTypeIds: ammoTypes.map((type) => type.id),
  });
  // 保存できなかった入力を戻すときは、その値を優先する（フォーム側で復元）。
  const isRestoring = searchParams.get("restore") !== null;

  const initialValues = draft
    ? {
        gunId: defaults.gunId,
        occurredOn: draft.occurredOn,
        ammoTypeId: draft.ammoTypeId ?? undefined,
        boxCount: draft.boxCount,
        looseRounds: draft.looseRounds,
      }
    : defaults;
  const showsPreviousDefaults = !draft && !isRestoring && fromPreviousEntry;

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h1 className="text-2xl font-semibold tracking-tight">消費した</h1>
        <p className="text-sm text-muted-foreground">
          箱数・バラで入力できます。帳簿には消費の発数のみ記録されます。
        </p>
        {showsPreviousDefaults ? (
          <p className="text-sm text-muted-foreground">
            前回の消費と同じ銃・弾・場所を入れています。違う場合は選び直してください。
          </p>
        ) : null}
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
          <ConsumeForm
            key={`${draftId ?? "new"}:${restoreId ?? ""}`}
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
