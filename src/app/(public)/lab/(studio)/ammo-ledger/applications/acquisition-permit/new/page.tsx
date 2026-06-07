import { AcquisitionPermitApplicationForm } from "@/features/ammo-ledger/acquisition-permit-application/components/acquisition-permit-application-form/acquisition-permit-application-form";
import { requireAmmoUser } from "@/features/ammo-ledger/auth/require-ammo-user";
import { buildCounterpartyPickerData } from "@/features/ammo-ledger/catalog/build-counterparty-picker-data/build-counterparty-picker-data";
import { computeStockByAmmoType } from "@/features/ammo-ledger/ledger/compute-stock/compute-stock";
import { listLedgerEntries } from "@/features/ammo-ledger/ledger/list-ledger-entries/list-ledger-entries";
import { listGuns } from "@/features/ammo-ledger/master/list-guns/list-guns";
import { listRanges } from "@/features/ammo-ledger/master/list-ranges/list-ranges";
import { getLedgerProfile } from "@/features/ammo-ledger/profile/get-ledger-profile/get-ledger-profile";
import { resolveOwnerName } from "@/features/ammo-ledger/profile/resolve-owner-name/resolve-owner-name";
import type { LedgerCategory } from "@/features/ammo-ledger/schema/ledger-category";

export default async function AcquisitionPermitApplicationNewPage() {
  const user = await requireAmmoUser();

  const [profile, guns, ranges, counterpartyPickerData, entries] = await Promise.all([
    getLedgerProfile({ userId: user.id }),
    listGuns({ userId: user.id }),
    listRanges({ userId: user.id }),
    buildCounterpartyPickerData({ userId: user.id }),
    listLedgerEntries({ userId: user.id }),
  ]);

  const ownerName = resolveOwnerName({
    profileOwnerName: profile?.ownerName,
    accountName: user.name,
  });

  const stockByAmmoType = computeStockByAmmoType({
    entries: entries
      .filter((entry) => !entry.voidedAt && entry.ammoTypeId)
      .map((entry) => ({
        ammoTypeId: entry.ammoTypeId as string,
        category: entry.category as LedgerCategory,
        quantity: entry.quantity,
      })),
  });

  const currentHomeStock = [...stockByAmmoType.values()].reduce((sum, value) => sum + value, 0);

  return (
    <AcquisitionPermitApplicationForm
      ownerName={ownerName}
      ownerAddress={profile?.ownerAddress ?? ""}
      currentHomeStock={Math.max(0, currentHomeStock)}
      guns={guns}
      ranges={ranges.map((range) => ({
        id: range.id,
        name: range.name,
        address: range.address,
      }))}
      counterpartyPickerData={counterpartyPickerData}
    />
  );
}
