import { requireAmmoUser } from "@/features/ammo-ledger/auth/require-ammo-user";
import { AmmoLedgerNav } from "@/features/ammo-ledger/components/ammo-ledger-nav/ammo-ledger-nav";
import { AmmoLedgerPanel } from "@/features/ammo-ledger/components/ammo-ledger-panel/ammo-ledger-panel";
import { LedgerProfileForm } from "@/features/ammo-ledger/components/ledger-profile-form/ledger-profile-form";
import { getLedgerProfile } from "@/features/ammo-ledger/profile/get-ledger-profile/get-ledger-profile";
import { resolveOwnerName } from "@/features/ammo-ledger/profile/resolve-owner-name/resolve-owner-name";

export default async function LedgerProfileSettingsPage() {
  const user = await requireAmmoUser();
  const profile = await getLedgerProfile({ userId: user.id });

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h1 className="text-2xl font-semibold tracking-tight">帳簿プロフィール</h1>
        <p className="text-sm text-muted-foreground">
          帳簿の表紙・印刷や取得許可申請書に使う氏名・住所・生年月日・電話番号を設定します。
        </p>
      </div>
      <AmmoLedgerNav />
      <AmmoLedgerPanel
        title={`表示名: ${resolveOwnerName({ profileOwnerName: profile?.ownerName, accountName: user.name })}`}
      >
        <LedgerProfileForm
          accountName={user.name}
          initialValues={{
            ownerName: profile?.ownerName ?? user.name,
            ownerAddress: profile?.ownerAddress,
            ownerBirthDate: profile?.ownerBirthDate,
            ownerPhone: profile?.ownerPhone,
          }}
        />
      </AmmoLedgerPanel>
    </div>
  );
}
