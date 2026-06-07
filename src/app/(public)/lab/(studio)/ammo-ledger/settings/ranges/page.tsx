import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { requireAmmoUser } from "@/features/ammo-ledger/auth/require-ammo-user";
import { AmmoLedgerNav } from "@/features/ammo-ledger/components/ammo-ledger-nav";
import { RangeForm } from "@/features/ammo-ledger/components/range-form/range-form";
import { listRanges } from "@/features/ammo-ledger/master/list-ranges/list-ranges";

export default async function RangesSettingsPage() {
  const user = await requireAmmoUser();
  const ranges = await listRanges({ userId: user.id });

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold tracking-tight">射撃場マスタ</h1>
      <AmmoLedgerNav />
      <Card className="border-border/70">
        <CardHeader>
          <CardTitle className="text-base">登録済み</CardTitle>
        </CardHeader>
        <CardContent>
          {ranges.length === 0 ? (
            <p className="text-sm text-muted-foreground">まだ登録がありません。</p>
          ) : (
            <ul className="space-y-2 text-sm">
              {ranges.map((range) => (
                <li key={range.id}>
                  {range.name} — {range.address}
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
      <Card className="border-border/70">
        <CardHeader>
          <CardTitle className="text-base">追加</CardTitle>
        </CardHeader>
        <CardContent>
          <RangeForm />
        </CardContent>
      </Card>
    </div>
  );
}
