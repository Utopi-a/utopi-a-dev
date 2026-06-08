"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { AmmoLedgerPanel } from "@/features/ammo-ledger/components/ammo-ledger-panel/ammo-ledger-panel";
import { ConsumeForm } from "@/features/ammo-ledger/components/consume-form/consume-form";
import { WorkspaceViewLoader } from "@/features/ammo-ledger/components/workspace-view-loader/workspace-view-loader";
import { useDraftTransaction } from "@/features/ammo-ledger/transactions/get-draft/use-draft-transaction/use-draft-transaction";
import { deriveFormWorkspaceData } from "@/features/ammo-ledger/workspace/derive-form-workspace-data/derive-form-workspace-data";
import { useAmmoLedgerWorkspace } from "@/features/ammo-ledger/workspace/use-ammo-ledger-workspace/use-ammo-ledger-workspace";

export function ConsumeNewView() {
  const searchParams = useSearchParams();
  const draftId = searchParams.get("draft");
  const { workspace, isLoading: isWorkspaceLoading } = useAmmoLedgerWorkspace();
  const { draft, isLoading: isDraftLoading } = useDraftTransaction({ draftId });

  if (isWorkspaceLoading || isDraftLoading || !workspace) {
    return <WorkspaceViewLoader />;
  }

  const { guns, ammoTypes, stockByAmmoTypeId } = deriveFormWorkspaceData({ workspace });

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
          <ConsumeForm
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
