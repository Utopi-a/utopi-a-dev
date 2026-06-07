import { requireAmmoUser } from "@/features/ammo-ledger/auth/require-ammo-user";
import { AmmoLedgerNav } from "@/features/ammo-ledger/components/ammo-ledger-nav/ammo-ledger-nav";
import { SettingsLinkList } from "@/features/ammo-ledger/components/settings-link-list/settings-link-list";

const settingsGroups = [
  {
    title: "帳簿",
    items: [
      {
        href: "/lab/ammo-ledger/settings/profile",
        label: "帳簿プロフィール",
        description: "氏名・住所（印刷にも使用）",
      },
      {
        href: "/lab/ammo-ledger/settings/permit-events",
        label: "許可残数イベント",
        description: "許可取得・失効・繰越",
      },
    ],
  },
  {
    title: "入力補助マスタ",
    items: [
      {
        href: "/lab/ammo-ledger/settings/ammo-types",
        label: "弾種",
        description: "番径・散弾/単弾・1箱あたり発数",
      },
      {
        href: "/lab/ammo-ledger/settings/guns",
        label: "銃",
        description: "名称・許可番号・銃種",
      },
      {
        href: "/lab/ammo-ledger/settings/ranges",
        label: "射撃場",
        description: "名称・所在地",
      },
      {
        href: "/lab/ammo-ledger/settings/counterparties",
        label: "購入先・譲渡先",
        description: "銃砲火薬店などの氏名と住所",
      },
    ],
  },
] as const;

export default async function AmmoLedgerSettingsPage() {
  await requireAmmoUser();

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h1 className="text-2xl font-semibold tracking-tight">設定</h1>
        <p className="text-sm text-muted-foreground">入力を速くするためのマスタと帳簿情報です。</p>
      </div>
      <AmmoLedgerNav />
      <SettingsLinkList groups={settingsGroups} />
    </div>
  );
}
