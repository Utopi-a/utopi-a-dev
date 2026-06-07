import { requireAmmoUser } from "@/features/ammo-ledger/auth/require-ammo-user";
import { AmmoLedgerNav } from "@/features/ammo-ledger/components/ammo-ledger-nav/ammo-ledger-nav";
import { AmmoLedgerPanel } from "@/features/ammo-ledger/components/ammo-ledger-panel/ammo-ledger-panel";
import { HomeStorageWarning } from "@/features/ammo-ledger/components/home-storage-warning/home-storage-warning";
import { InventoryOverviewPanel } from "@/features/ammo-ledger/components/inventory-overview/inventory-overview";
import { StockCheckForm } from "@/features/ammo-ledger/components/stock-check-form/stock-check-form";
import { buildInventoryOverview } from "@/features/ammo-ledger/inventory/build-inventory-overview/build-inventory-overview";
import { evaluateHomeStorageLimit } from "@/features/ammo-ledger/ledger/compute-running-home-stock/compute-running-home-stock";
import { getInventorySummary } from "@/features/ammo-ledger/ledger/get-inventory-summary/get-inventory-summary";
import { listLedgerEntries } from "@/features/ammo-ledger/ledger/list-ledger-entries/list-ledger-entries";
import type { LedgerCategory } from "@/features/ammo-ledger/schema/ledger-category";

export default async function InventoryPage() {
  const user = await requireAmmoUser();
  const [summary, allEntries] = await Promise.all([
    getInventorySummary({ userId: user.id }),
    listLedgerEntries({ userId: user.id }),
  ]);

  const homeStorage = evaluateHomeStorageLimit({
    entries: allEntries.map((entry) => ({
      id: entry.id,
      occurredOn: entry.occurredOn,
      category: entry.category as LedgerCategory,
      quantity: entry.quantity,
    })),
  });

  const items = summary.map((s) => ({
    ammoTypeId: s.ammoType.id,
    ammoTypeName: s.ammoType.name,
    gaugeNumber: s.ammoType.gaugeNumber,
    defaultPurpose: s.ammoType.defaultPurpose,
    roundsPerBox: s.ammoType.roundsPerBox,
    bookStock: s.bookStock,
  }));

  const overview = buildInventoryOverview({ items });

  const stockCheckItems = items.map((item) => ({
    ammoTypeId: item.ammoTypeId,
    ammoTypeName: item.ammoTypeName,
    roundsPerBox: item.roundsPerBox,
    bookStock: item.bookStock,
  }));

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h1 className="text-2xl font-semibold tracking-tight">残弾確認</h1>
        <p className="text-sm text-muted-foreground">
          まず一覧で帳簿残数を確認し、必要なら実在庫との照合を行います。
        </p>
      </div>
      <AmmoLedgerNav />

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
    </div>
  );
}
