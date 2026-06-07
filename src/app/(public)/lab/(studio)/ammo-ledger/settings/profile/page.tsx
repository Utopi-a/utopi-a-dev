import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { requireAmmoUser } from "@/features/ammo-ledger/auth/require-ammo-user";
import { AmmoLedgerNav } from "@/features/ammo-ledger/components/ammo-ledger-nav";
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
        <p className="text-sm text-muted-foreground">印刷・表紙に載せる氏名と住所を設定します。</p>
      </div>
      <AmmoLedgerNav />
      <Card className="border-border/70">
        <CardHeader>
          <CardTitle className="text-base">
            現在の表示名:{" "}
            {resolveOwnerName({ profileOwnerName: profile?.ownerName, accountName: user.name })}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <LedgerProfileForm
            accountName={user.name}
            initialValues={{
              ownerName: profile?.ownerName ?? user.name,
              ownerAddress: profile?.ownerAddress,
            }}
          />
        </CardContent>
      </Card>
    </div>
  );
}
