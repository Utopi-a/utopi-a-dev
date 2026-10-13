import { AcquisitionPermitApplicationFormLazy } from "@/features/ammo-ledger/acquisition-permit-application/components/acquisition-permit-application-form/acquisition-permit-application-form.lazy";
import { requireAmmoUser } from "@/features/ammo-ledger/auth/require-ammo-user";
import { evaluateHomeStorageLimit } from "@/features/ammo-ledger/ledger/compute-running-home-stock/compute-running-home-stock";
import { listLedgerEntries } from "@/features/ammo-ledger/ledger/list-ledger-entries/list-ledger-entries";
import { listAmmoTypes } from "@/features/ammo-ledger/master/list-ammo-types/list-ammo-types";
import { listGuns } from "@/features/ammo-ledger/master/list-guns/list-guns";
import { getLedgerProfile } from "@/features/ammo-ledger/profile/get-ledger-profile/get-ledger-profile";
import { resolveOwnerName } from "@/features/ammo-ledger/profile/resolve-owner-name/resolve-owner-name";
import type { LedgerCategory } from "@/features/ammo-ledger/schema/ledger-category";
import { computeInventoryItems } from "@/features/ammo-ledger/workspace/compute-inventory-items/compute-inventory-items";

export default async function AcquisitionPermitApplicationNewPage() {
  const user = await requireAmmoUser();

  const [profile, guns, entries, ammoTypes] = await Promise.all([
    getLedgerProfile({ userId: user.id }),
    listGuns({ userId: user.id }),
    listLedgerEntries({ userId: user.id }),
    listAmmoTypes({ userId: user.id }),
  ]);

  const ownerName = resolveOwnerName({
    profileOwnerName: profile?.ownerName,
    accountName: user.name,
  });

  const { currentStock: totalHomeStock } = evaluateHomeStorageLimit({
    entries: entries.map((entry) => ({ ...entry, category: entry.category as LedgerCategory })),
  });
  const ammoTypeStocks = computeInventoryItems({ entries, ammoTypes }).map(
    ({ ammoType, bookStock }) => ({
      cartridgeType: ammoType.cartridgeType,
      caliber: ammoType.caliber,
      bookStock,
    }),
  );

  return (
    <AcquisitionPermitApplicationFormLazy
      ownerName={ownerName}
      ownerFurigana={profile?.ownerFurigana ?? undefined}
      possessionPermitCertificateNumber={profile?.possessionPermitCertificateNumber ?? undefined}
      ownerAddress={profile?.ownerAddress ?? ""}
      ownerBirthDate={profile?.ownerBirthDate ?? undefined}
      ownerPhone={profile?.ownerPhone ?? undefined}
      totalHomeStock={Math.max(0, totalHomeStock)}
      ammoTypeStocks={ammoTypeStocks}
      guns={guns}
    />
  );
}
