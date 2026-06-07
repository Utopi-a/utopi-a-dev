import { requireAmmoUser } from "@/features/ammo-ledger/auth/require-ammo-user";
import { AmmoLedgerNav } from "@/features/ammo-ledger/components/ammo-ledger-nav/ammo-ledger-nav";
import { AmmoLedgerPanel } from "@/features/ammo-ledger/components/ammo-ledger-panel/ammo-ledger-panel";
import { RangeForm } from "@/features/ammo-ledger/components/range-form/range-form";
import { RangeRowActions } from "@/features/ammo-ledger/components/range-row-actions/range-row-actions";
import { listRanges } from "@/features/ammo-ledger/master/list-ranges/list-ranges";

export default async function RangesSettingsPage() {
  const user = await requireAmmoUser();
  const ranges = await listRanges({ userId: user.id });

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold tracking-tight">射撃場</h1>
      <AmmoLedgerNav />
      <AmmoLedgerPanel title="登録済み">
        {ranges.length === 0 ? (
          <p className="text-sm text-muted-foreground">まだ登録がありません。</p>
        ) : (
          <ul className="divide-y divide-border/50 text-sm">
            {ranges.map((range) => (
              <li
                key={range.id}
                className="flex items-start justify-between gap-4 py-3 first:pt-0 last:pb-0"
              >
                <span>
                  {range.name} — {range.address}
                </span>
                <RangeRowActions rangeId={range.id} />
              </li>
            ))}
          </ul>
        )}
      </AmmoLedgerPanel>
      <AmmoLedgerPanel title="追加">
        <RangeForm />
      </AmmoLedgerPanel>
    </div>
  );
}
