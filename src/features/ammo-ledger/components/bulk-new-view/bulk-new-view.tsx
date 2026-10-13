"use client";

import Link from "next/link";
import { AmmoLedgerPanel } from "@/features/ammo-ledger/components/ammo-ledger-panel/ammo-ledger-panel";
import { BulkEntryForm } from "@/features/ammo-ledger/components/bulk-entry-form/bulk-entry-form";
import {
  type MissingMaster,
  MissingMastersNotice,
} from "@/features/ammo-ledger/components/missing-masters-notice/missing-masters-notice";
import { WorkspaceViewLoader } from "@/features/ammo-ledger/components/workspace-view-loader/workspace-view-loader";
import { resolveConsumeDefaults } from "@/features/ammo-ledger/transactions/resolve-consume-defaults/resolve-consume-defaults";
import { deriveFormWorkspaceData } from "@/features/ammo-ledger/workspace/derive-form-workspace-data/derive-form-workspace-data";
import { useAmmoLedgerWorkspace } from "@/features/ammo-ledger/workspace/use-ammo-ledger-workspace/use-ammo-ledger-workspace";

export function BulkNewView() {
  const { workspace, isLoading, error, retry } = useAmmoLedgerWorkspace();

  if (isLoading || !workspace) {
    return <WorkspaceViewLoader error={error} onRetry={retry} />;
  }

  const { guns, ammoTypes, stockByAmmoTypeId } = deriveFormWorkspaceData({ workspace });
  const { gunId, ammoTypeId, purpose } = resolveConsumeDefaults({
    entries: workspace.entries,
    gunIds: guns.map((gun) => gun.id),
    ammoTypes,
  });
  const missingMasters: MissingMaster[] = [
    ...(guns.length === 0 ? (["gun"] as const) : []),
    ...(ammoTypes.length === 0 ? (["ammo-type"] as const) : []),
  ];

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
      {missingMasters.length > 0 ? (
        <AmmoLedgerPanel>
          <MissingMastersNotice
            action="まとめて記録する"
            missing={missingMasters}
            returnTo="/lab/ammo-ledger/bulk/new"
          />
        </AmmoLedgerPanel>
      ) : (
        <BulkEntryForm
          guns={guns}
          ammoTypes={ammoTypes}
          stockByAmmoTypeId={stockByAmmoTypeId}
          firstRowCarryOver={{ gunId, ammoTypeId, purpose }}
        />
      )}
    </div>
  );
}
