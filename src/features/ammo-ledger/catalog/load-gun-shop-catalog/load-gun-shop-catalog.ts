import { buildGunShopCatalogId } from "@/features/ammo-ledger/catalog/build-gun-shop-catalog-id/build-gun-shop-catalog-id";
import { groupCatalogByPrefecture } from "@/features/ammo-ledger/catalog/group-catalog-by-prefecture/group-catalog-by-prefecture";
import type { CatalogEntry } from "@/features/ammo-ledger/catalog/schema/catalog-entry";
import type { ScrapedGunShopDataset } from "@/features/ammo-ledger/counterparty-seed/scrape-nikkaren-traders/scraped-gun-shop";
import shopDataset from "@/features/ammo-ledger/counterparty-seed/seed-data/nikkaren-traders.json";
import { normalizePrefecture } from "@/features/ammo-ledger/range-seed/resolve-range-addresses/normalize-prefecture";

const typedDataset = shopDataset as ScrapedGunShopDataset;

let cachedEntries: CatalogEntry[] | undefined;
let cachedById: Map<string, CatalogEntry> | undefined;

function buildEntries(): CatalogEntry[] {
  return typedDataset.shops.flatMap((shop) => {
    if (shop.listNumber === null) {
      return [];
    }

    const prefecture = normalizePrefecture({ prefecture: shop.prefecture });

    return [
      {
        catalogId: buildGunShopCatalogId({ listNumber: shop.listNumber }),
        name: shop.name,
        address: shop.address,
        prefecture,
        location: shop.location,
        phone: shop.phone,
        kind: "shop" as const,
      },
    ];
  });
}

export function loadGunShopCatalog(): CatalogEntry[] {
  cachedEntries ??= buildEntries();
  return cachedEntries;
}

export function getGunShopCatalogEntry({
  catalogId,
}: {
  catalogId: string;
}): CatalogEntry | undefined {
  if (!cachedById) {
    cachedById = new Map(loadGunShopCatalog().map((entry) => [entry.catalogId, entry]));
  }

  return cachedById.get(catalogId);
}

export function loadGunShopCatalogByPrefecture() {
  return groupCatalogByPrefecture({ entries: loadGunShopCatalog() });
}
