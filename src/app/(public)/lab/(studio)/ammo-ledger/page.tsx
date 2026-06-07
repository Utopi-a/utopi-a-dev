import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { requireAmmoUser } from "@/features/ammo-ledger/auth/require-ammo-user";
import { AmmoLedgerNav } from "@/features/ammo-ledger/components/ammo-ledger-nav";
import { cn } from "@/lib/cn";

const actions = [
  { href: "/lab/ammo-ledger/consume/new", label: "今日撃った", description: "消費記録を入力" },
  { href: "/lab/ammo-ledger/acquire/new", label: "弾を買った", description: "譲受記録を入力" },
  { href: "/lab/ammo-ledger/dispose/new", label: "弾を廃棄した", description: "廃棄記録を入力" },
  { href: "/lab/ammo-ledger/ledger", label: "帳簿を見る", description: "法定帳簿を確認" },
] as const;

export default async function AmmoLedgerHomePage() {
  await requireAmmoUser();

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h1 className="text-2xl font-semibold tracking-tight">実包管理帳簿</h1>
        <p className="text-sm text-muted-foreground">
          日常入力は箱・バラで雑に。帳簿出力は法定区分のみ。
        </p>
      </div>

      <AmmoLedgerNav />

      <div className="grid gap-4 sm:grid-cols-2">
        {actions.map((action) => (
          <Card key={action.href} className="border-border/70">
            <CardHeader>
              <CardTitle className="text-base">{action.label}</CardTitle>
              <CardDescription>{action.description}</CardDescription>
            </CardHeader>
            <CardContent>
              <Link href={action.href} className={cn(buttonVariants({ variant: "default" }))}>
                開く
              </Link>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
