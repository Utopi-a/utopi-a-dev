import { requireAmmoUser } from "@/features/ammo-ledger/auth/require-ammo-user";
import { GunPermitApplicationFormLazy } from "@/features/ammo-ledger/gun-possession-permit-application/components/gun-permit-application-form/gun-permit-application-form.lazy";
import { listGuns } from "@/features/ammo-ledger/master/list-guns/list-guns";
import { getLedgerProfile } from "@/features/ammo-ledger/profile/get-ledger-profile/get-ledger-profile";
import { resolveOwnerName } from "@/features/ammo-ledger/profile/resolve-owner-name/resolve-owner-name";

export default async function GunPossessionPermitApplicationNewPage() {
  const user = await requireAmmoUser();

  const [profile, guns] = await Promise.all([
    getLedgerProfile({ userId: user.id }),
    listGuns({ userId: user.id }),
  ]);

  const ownerName = resolveOwnerName({
    profileOwnerName: profile?.ownerName,
    accountName: user.name,
  });

  return (
    <GunPermitApplicationFormLazy
      ownerName={ownerName}
      ownerAddress={profile?.ownerAddress ?? ""}
      ownerBirthDate={profile?.ownerBirthDate ?? undefined}
      ownerPhone={profile?.ownerPhone ?? undefined}
      guns={guns}
    />
  );
}
