"use client";

import { useMemo } from "react";
import { AmmoLedgerPanel } from "@/features/ammo-ledger/components/ammo-ledger-panel/ammo-ledger-panel";
import { AmmoLedgerRefreshIndicator } from "@/features/ammo-ledger/components/ammo-ledger-refresh-indicator/ammo-ledger-refresh-indicator";
import { HomeStorageWarning } from "@/features/ammo-ledger/components/home-storage-warning/home-storage-warning";
import { InventoryOverviewPanel } from "@/features/ammo-ledger/components/inventory-overview/inventory-overview";
import { StockCheckForm } from "@/features/ammo-ledger/components/stock-check-form/stock-check-form";
import { WorkspaceViewLoader } from "@/features/ammo-ledger/components/workspace-view-loader/workspace-view-loader";
import { buildInventoryOverview } from "@/features/ammo-ledger/inventory/build-inventory-overview/build-inventory-overview";
import { evaluateHomeStorageLimit } from "@/features/ammo-ledger/ledger/compute-running-home-stock/compute-running-home-stock";
import type { LedgerCategory } from "@/features/ammo-ledger/schema/ledger-category";
import type { AmmoLedgerWorkspace } from "@/features/ammo-ledger/workspace/ammo-ledger-workspace-types";
import { useAmmoLedgerWorkspace } from "@/features/ammo-ledger/workspace/use-ammo-ledger-workspace/use-ammo-ledger-workspace";

type InventoryViewContentProps = {
  workspace: AmmoLedgerWorkspace;
  isRefreshing: boolean;
};

function InventoryViewContent({ workspace, isRefreshing }: InventoryViewContentProps) {
  const { entries, inventoryItems } = workspace;

  const homeStorage = useMemo(
    () =>
      evaluateHomeStorageLimit({
        entries: entries.map((entry) => ({
          id: entry.id,
          occurredOn: entry.occurredOn,
          category: entry.category as LedgerCategory,
          quantity: entry.quantity,
        })),
      }),
    [entries],
  );

  const items = useMemo(
    () =>
      inventoryItems.map((summary) => ({
        ammoTypeId: summary.ammoType.id,
        ammoTypeName: summary.ammoType.name,
        gaugeNumber: summary.ammoType.gaugeNumber,
        defaultPurpose: summary.ammoType.defaultPurpose,
        roundsPerBox: summary.ammoType.roundsPerBox,
        bookStock: summary.bookStock,
      })),
    [inventoryItems],
  );

  const overview = useMemo(() => buildInventoryOverview({ items }), [items]);

  const stockCheckItems = useMemo(
    () =>
      items.map((item) => ({
        ammoTypeId: item.ammoTypeId,
        ammoTypeName: item.ammoTypeName,
        roundsPerBox: item.roundsPerBox,
        bookStock: item.bookStock,
      })),
    [items],
  );

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h1 className="text-2xl font-semibold tracking-tight">残弾確認</h1>
        <p className="text-sm text-muted-foreground">
          まず一覧で帳簿残数を確認し、必要なら実在庫との照合を行います。
        </p>
      </div>

      <HomeStorageWarning
        currentStock={homeStorage.currentStock}
        peakStock={homeStorage.peakStock}
      />

      <AmmoLedgerPanel title="帳簿残数" description="弾種・号数・グループごとに一覧表示します">
        <InventoryOverviewPanel overview={overview} />
      </AmmoLedgerPanel>

      <AmmoLedgerPanel
        title="実在庫との照合"
        description="差分は調整行にせず、記録の下書きに変換します"
      >
        <StockCheckForm items={stockCheckItems} />
      </AmmoLedgerPanel>

      <AmmoLedgerRefreshIndicator visible={isRefreshing} />
    </div>
  );
}

export function InventoryView() {
  const { workspace, isLoading, isRefreshing } = useAmmoLedgerWorkspace();

  if (isLoading || !workspace) {
    return <WorkspaceViewLoader />;
  }

  return <InventoryViewContent workspace={workspace} isRefreshing={isRefreshing} />;
}
