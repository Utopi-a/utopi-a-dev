import { listCatalogFavoriteIds } from "@/features/ammo-ledger/catalog/list-catalog-favorites/list-catalog-favorites";
import { listRecentRanges } from "@/features/ammo-ledger/catalog/list-recent-ranges/list-recent-ranges";
import {
  getRangeCatalogEntry,
  loadRangeCatalogByPrefecture,
} from "@/features/ammo-ledger/catalog/load-range-catalog/load-range-catalog";
import type { MasterPickerData } from "@/features/ammo-ledger/catalog/schema/catalog-entry";
import { listRanges } from "@/features/ammo-ledger/master/list-ranges/list-ranges";

export async function buildRangePickerData({
  userId,
}: {
  userId: string;
}): Promise<MasterPickerData> {
  const [ranges, recent, favoriteCatalogIds] = await Promise.all([
    listRanges({ userId }),
    listRecentRanges({ userId }),
    listCatalogFavoriteIds({ userId, catalogKind: "range" }),
  ]);

  const registered: MasterPickerData["registered"] = ranges.map((range) => ({
    id: range.id,
    name: range.name,
    address: range.address,
    catalogId: range.catalogId,
  }));

  const registeredCatalogIds = ranges.flatMap((range) =>
    range.catalogId ? [range.catalogId] : [],
  );

  const recentIds = new Set(recent.map((item) => item.id));
  const registeredWithoutRecent = registered.filter((item) => !recentIds.has(item.id));

  const favorites = favoriteCatalogIds.flatMap((catalogId) => {
    const entry = getRangeCatalogEntry({ catalogId });
    return entry ? [entry] : [];
  });

  return {
    favorites,
    recent,
    registered: registeredWithoutRecent,
    catalogByPrefecture: loadRangeCatalogByPrefecture(),
    favoriteCatalogIds,
    registeredCatalogIds,
  };
}
