import { listCatalogFavoriteIds } from "@/features/ammo-ledger/catalog/list-catalog-favorites/list-catalog-favorites";
import { listRecentCounterparties } from "@/features/ammo-ledger/catalog/list-recent-counterparties/list-recent-counterparties";
import {
  getGunShopCatalogEntry,
  loadGunShopCatalogByPrefecture,
} from "@/features/ammo-ledger/catalog/load-gun-shop-catalog/load-gun-shop-catalog";
import type { MasterPickerData } from "@/features/ammo-ledger/catalog/schema/catalog-entry";
import { listCounterparties } from "@/features/ammo-ledger/master/list-counterparties/list-counterparties";

export async function buildCounterpartyPickerData({
  userId,
}: {
  userId: string;
}): Promise<MasterPickerData> {
  const [counterparties, recent, favoriteCatalogIds] = await Promise.all([
    listCounterparties({ userId }),
    listRecentCounterparties({ userId }),
    listCatalogFavoriteIds({ userId, catalogKind: "gun_shop" }),
  ]);

  const registered: MasterPickerData["registered"] = counterparties.map((item) => ({
    id: item.id,
    name: item.name,
    address: item.address,
    catalogId: item.catalogId,
  }));

  const registeredCatalogIds = counterparties.flatMap((item) =>
    item.catalogId ? [item.catalogId] : [],
  );

  const recentIds = new Set(recent.map((item) => item.id));
  const registeredWithoutRecent = registered.filter((item) => !recentIds.has(item.id));

  const favorites = favoriteCatalogIds.flatMap((catalogId) => {
    const entry = getGunShopCatalogEntry({ catalogId });
    return entry ? [entry] : [];
  });

  return {
    favorites,
    recent,
    registered: registeredWithoutRecent,
    catalogByPrefecture: loadGunShopCatalogByPrefecture(),
    favoriteCatalogIds,
    registeredCatalogIds,
  };
}
