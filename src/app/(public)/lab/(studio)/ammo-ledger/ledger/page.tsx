import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { requireAmmoUser } from "@/features/ammo-ledger/auth/require-ammo-user";
import { AmmoLedgerNav } from "@/features/ammo-ledger/components/ammo-ledger-nav";
import { LedgerTable } from "@/features/ammo-ledger/components/ledger-table/ledger-table";
import { listLedgerEntries } from "@/features/ammo-ledger/ledger/list-ledger-entries/list-ledger-entries";
import { cn } from "@/lib/cn";

export default async function LedgerPage() {
  const user = await requireAmmoUser();
  const entries = await listLedgerEntries({ userId: user.id });

  const from = entries[0]?.occurredOn ?? new Date().toISOString().slice(0, 10);
  const to = entries[entries.length - 1]?.occurredOn ?? from;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="space-y-2">
          <h1 className="text-2xl font-semibold tracking-tight">実包管理帳簿</h1>
          <p className="text-sm text-muted-foreground">法定区分のみ表示。内部メモは含みません。</p>
        </div>
        <Link
          href={`/lab/ammo-ledger/ledger/print?from=${from}&to=${to}`}
          className={cn(buttonVariants({ variant: "outline" }))}
        >
          帳簿印刷
        </Link>
      </div>
      <AmmoLedgerNav />
      <Card className="border-border/70">
        <CardHeader>
          <CardTitle className="text-base">記録一覧</CardTitle>
        </CardHeader>
        <CardContent>
          <LedgerTable entries={entries} />
        </CardContent>
      </Card>
    </div>
  );
}
