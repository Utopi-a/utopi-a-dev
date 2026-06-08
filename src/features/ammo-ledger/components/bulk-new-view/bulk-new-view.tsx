"use client";

import Link from "next/link";
import { BulkEntryForm } from "@/features/ammo-ledger/components/bulk-entry-form/bulk-entry-form";
import { WorkspaceViewLoader } from "@/features/ammo-ledger/components/workspace-view-loader/workspace-view-loader";
import { deriveFormWorkspaceData } from "@/features/ammo-ledger/workspace/derive-form-workspace-data/derive-form-workspace-data";
import { useAmmoLedgerWorkspace } from "@/features/ammo-ledger/workspace/use-ammo-ledger-workspace/use-ammo-ledger-workspace";

export function BulkNewView() {
  const { workspace, isLoading } = useAmmoLedgerWorkspace();

  if (isLoading || !workspace) {
    return <WorkspaceViewLoader />;
  }

  const { guns, ammoTypes, stockByAmmoTypeId } = deriveFormWorkspaceData({ workspace });

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h1 className="text-2xl font-semibold tracking-tight">まとめて追加</h1>
        <p className="text-sm text-muted-foreground">
          消費と譲り受けを混ぜて、日付・弾・銃・用途の違う記録を一度に登録できます。
        </p>
        <p className="text-sm text-muted-foreground">
          1件だけ記録する場合は
          <Link href="/lab/ammo-ledger/consume/new" className="underline">
            消費した
          </Link>
          や
          <Link href="/lab/ammo-ledger/inflow/new" className="underline">
            譲り受けた
          </Link>
          から入力してください。
        </p>
      </div>
      {guns.length === 0 || ammoTypes.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          銃・弾種のマスタを
          <Link href="/lab/ammo-ledger/settings" className="underline">
            設定
          </Link>
          から登録してください。
        </p>
      ) : (
        <BulkEntryForm guns={guns} ammoTypes={ammoTypes} stockByAmmoTypeId={stockByAmmoTypeId} />
      )}
    </div>
  );
}
