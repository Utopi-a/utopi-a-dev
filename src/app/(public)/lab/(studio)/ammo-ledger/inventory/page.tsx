import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { requireAmmoUser } from "@/features/ammo-ledger/auth/require-ammo-user";
import { AmmoLedgerNav } from "@/features/ammo-ledger/components/ammo-ledger-nav";
import { StockCheckForm } from "@/features/ammo-ledger/components/stock-check-form/stock-check-form";
import { getInventorySummary } from "@/features/ammo-ledger/ledger/get-inventory-summary/get-inventory-summary";

export default async function InventoryPage() {
  const user = await requireAmmoUser();
  const summary = await getInventorySummary({ userId: user.id });

  const items = summary.map((s) => ({
    ammoTypeId: s.ammoType.id,
    ammoTypeName: s.ammoType.name,
    roundsPerBox: s.ammoType.roundsPerBox,
    bookStock: s.bookStock,
  }));

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h1 className="text-2xl font-semibold tracking-tight">残弾確認</h1>
        <p className="text-sm text-muted-foreground">
          差分は調整行にせず、消費・廃棄・譲渡・譲受の下書きに変換します。
        </p>
      </div>
      <AmmoLedgerNav />
      <Card className="border-border/70">
        <CardHeader>
          <CardTitle className="text-base">在庫照合</CardTitle>
        </CardHeader>
        <CardContent>
          <StockCheckForm items={items} />
        </CardContent>
      </Card>
    </div>
  );
}
