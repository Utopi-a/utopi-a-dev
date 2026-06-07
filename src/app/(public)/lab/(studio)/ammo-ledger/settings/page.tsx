import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { requireAmmoUser } from "@/features/ammo-ledger/auth/require-ammo-user";
import { AmmoLedgerNav } from "@/features/ammo-ledger/components/ammo-ledger-nav";
import { cn } from "@/lib/cn";

const settingsLinks = [
  {
    href: "/lab/ammo-ledger/settings/profile",
    label: "帳簿プロフィール",
    description: "帳簿・印刷に載せる氏名と住所",
  },
  {
    href: "/lab/ammo-ledger/settings/ammo-types",
    label: "弾種マスタ",
    description: "番径・散弾/単弾・1箱あたり発数",
  },
  {
    href: "/lab/ammo-ledger/settings/guns",
    label: "銃マスタ",
    description: "名称・許可番号・銃種",
  },
  { href: "/lab/ammo-ledger/settings/ranges", label: "射撃場マスタ", description: "名称・所在地" },
  {
    href: "/lab/ammo-ledger/settings/counterparties",
    label: "購入先マスタ",
    description: "銃砲火薬店・譲渡相手の氏名と住所",
  },
  {
    href: "/lab/ammo-ledger/settings/permit-events",
    label: "許可残数イベント",
    description: "許可取得・失効・繰越の手入力",
  },
] as const;

export default async function AmmoLedgerSettingsPage() {
  await requireAmmoUser();

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h1 className="text-2xl font-semibold tracking-tight">設定</h1>
        <p className="text-sm text-muted-foreground">入力補助用のマスタを管理します。</p>
      </div>
      <AmmoLedgerNav />
      <div className="grid gap-4">
        {settingsLinks.map((link) => (
          <Card key={link.href} className="border-border/70">
            <CardHeader>
              <CardTitle className="text-base">{link.label}</CardTitle>
              <CardDescription>{link.description}</CardDescription>
            </CardHeader>
            <CardContent>
              <Link href={link.href} className={cn(buttonVariants({ variant: "outline" }))}>
                管理
              </Link>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
