import Link from "next/link";
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
      <div className="space-y-2">
        <h1 className="text-2xl font-semibold tracking-tight">射撃場</h1>
        <p className="text-sm text-muted-foreground">
          よく使う射撃場のマイリストです。
          <Link href="/lab/ammo-ledger/settings/ranges/catalog" className="ml-1 underline">
            全国一覧から探す
          </Link>
        </p>
      </div>
      <AmmoLedgerNav />
      <AmmoLedgerPanel title="マイリスト">
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
                  {range.catalogId ? (
                    <span className="ml-2 text-xs text-muted-foreground">（全国一覧）</span>
                  ) : (
                    <span className="ml-2 text-xs text-muted-foreground">（手入力）</span>
                  )}
                </span>
                <RangeRowActions rangeId={range.id} />
              </li>
            ))}
          </ul>
        )}
      </AmmoLedgerPanel>
      <AmmoLedgerPanel title="手入力で追加">
        <RangeForm />
      </AmmoLedgerPanel>
    </div>
  );
}
