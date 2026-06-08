"use server";

import { requireAmmoUser } from "@/features/ammo-ledger/auth/require-ammo-user";
import { buildCounterpartyPickerData } from "@/features/ammo-ledger/catalog/build-counterparty-picker-data/build-counterparty-picker-data";
import { buildRangePickerData } from "@/features/ammo-ledger/catalog/build-range-picker-data/build-range-picker-data";
import type { MasterPickerData } from "@/features/ammo-ledger/catalog/schema/catalog-entry";
import type { CatalogKind } from "@/features/ammo-ledger/catalog/schema/catalog-kind";

export async function getMasterPickerDataAction({
  catalogKind,
  includeRangeCatalog = false,
}: {
  catalogKind: CatalogKind;
  includeRangeCatalog?: boolean;
}): Promise<MasterPickerData> {
  const user = await requireAmmoUser({ rateLimit: "read" });

  if (catalogKind === "range") {
    return buildRangePickerData({ userId: user.id });
  }

  return buildCounterpartyPickerData({
    userId: user.id,
    includeRangeCatalog,
  });
}
