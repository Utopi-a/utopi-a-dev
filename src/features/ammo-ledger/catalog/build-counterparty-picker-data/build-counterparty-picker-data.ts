import { listCatalogFavoriteIds } from "@/features/ammo-ledger/catalog/list-catalog-favorites/list-catalog-favorites";
import { listRecentCounterparties } from "@/features/ammo-ledger/catalog/list-recent-counterparties/list-recent-counterparties";
import {
  getGunShopCatalogEntry,
  loadGunShopCatalogByPrefecture,
} from "@/features/ammo-ledger/catalog/load-gun-shop-catalog/load-gun-shop-catalog";
import {
  getRangeCatalogEntry,
  loadRangeCatalogByPrefecture,
} from "@/features/ammo-ledger/catalog/load-range-catalog/load-range-catalog";
import { mergeCatalogPrefectureGroups } from "@/features/ammo-ledger/catalog/merge-catalog-prefecture-groups/merge-catalog-prefecture-groups";
import type {
  CatalogEntry,
  MasterPickerData,
} from "@/features/ammo-ledger/catalog/schema/catalog-entry";
import { listCounterparties } from "@/features/ammo-ledger/master/list-counterparties/list-counterparties";
import { listRanges } from "@/features/ammo-ledger/master/list-ranges/list-ranges";

export async function buildCounterpartyPickerData({
  userId,
  includeRangeCatalog = false,
}: {
  userId: string;
  includeRangeCatalog?: boolean;
}): Promise<MasterPickerData> {
  const [counterparties, recent, gunShopFavoriteCatalogIds, ranges, rangeFavoriteCatalogIds] =
    await Promise.all([
      listCounterparties({ userId }),
      listRecentCounterparties({ userId }),
      listCatalogFavoriteIds({ userId, catalogKind: "gun_shop" }),
      includeRangeCatalog ? listRanges({ userId }) : Promise.resolve([]),
      includeRangeCatalog
        ? listCatalogFavoriteIds({ userId, catalogKind: "range" })
        : Promise.resolve([]),
    ]);

  const registered: MasterPickerData["registered"] = counterparties.map((item) => ({
    id: item.id,
    name: item.name,
    address: item.address,
    catalogId: item.catalogId,
  }));

  const registeredCatalogIds = [
    ...counterparties.flatMap((item) => (item.catalogId ? [item.catalogId] : [])),
    ...(includeRangeCatalog
      ? ranges.flatMap((range) => (range.catalogId ? [range.catalogId] : []))
      : []),
  ];

  const counterpartyIdByCatalogId = Object.fromEntries(
    counterparties.flatMap((item) => (item.catalogId ? [[item.catalogId, item.id]] : [])),
  );

  const recentIds = new Set(recent.map((item) => item.id));
  const registeredWithoutRecent = registered.filter((item) => !recentIds.has(item.id));

  const registeredRangeMasters = includeRangeCatalog
    ? ranges
        .filter((range) => range.catalogId && !counterpartyIdByCatalogId[range.catalogId])
        .map((range) => ({
          id: range.id,
          name: range.name,
          address: range.address,
          catalogId: range.catalogId,
        }))
    : [];

  const favoriteCatalogIds = includeRangeCatalog
    ? [...new Set([...gunShopFavoriteCatalogIds, ...rangeFavoriteCatalogIds])]
    : gunShopFavoriteCatalogIds;

  const favorites: CatalogEntry[] = [];
  for (const catalogId of favoriteCatalogIds) {
    const gunShopEntry = getGunShopCatalogEntry({ catalogId });
    if (gunShopEntry) {
      favorites.push({ ...gunShopEntry, catalogSource: "gun_shop" });
      continue;
    }

    if (!includeRangeCatalog) {
      continue;
    }

    const rangeEntry = getRangeCatalogEntry({ catalogId });
    if (rangeEntry) {
      favorites.push({ ...rangeEntry, catalogSource: "range" });
    }
  }

  const catalogByPrefecture = includeRangeCatalog
    ? mergeCatalogPrefectureGroups({
        gunShopGroups: loadGunShopCatalogByPrefecture(),
        rangeGroups: loadRangeCatalogByPrefecture(),
      })
    : loadGunShopCatalogByPrefecture();

  return {
    favorites,
    recent,
    registered: registeredWithoutRecent,
    catalogByPrefecture,
    favoriteCatalogIds,
    registeredCatalogIds,
    counterpartyIdByCatalogId,
    includesRangeCatalog: includeRangeCatalog,
    registeredRangeMasters,
  };
}
