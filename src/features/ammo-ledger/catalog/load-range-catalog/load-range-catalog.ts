import { buildRangeCatalogId } from "@/features/ammo-ledger/catalog/build-range-catalog-id/build-range-catalog-id";
import { groupCatalogByPrefecture } from "@/features/ammo-ledger/catalog/group-catalog-by-prefecture/group-catalog-by-prefecture";
import type { CatalogEntry } from "@/features/ammo-ledger/catalog/schema/catalog-entry";
import { normalizePrefecture } from "@/features/ammo-ledger/range-seed/resolve-range-addresses/normalize-prefecture";
import type { ScrapedRangeDataset } from "@/features/ammo-ledger/range-seed/scrape-shajoukyo-ranges/scraped-range";
import rangeDataset from "@/features/ammo-ledger/range-seed/seed-data/shajoukyo-ranges-with-addresses.json";

const typedDataset = rangeDataset as ScrapedRangeDataset;

let cachedEntries: CatalogEntry[] | undefined;
let cachedById: Map<string, CatalogEntry> | undefined;

function buildEntries(): CatalogEntry[] {
  return typedDataset.ranges.map((range) => {
    const prefecture = normalizePrefecture({ prefecture: range.prefecture });

    return {
      catalogId: buildRangeCatalogId({ name: range.name, prefecture }),
      name: range.name,
      address: range.address,
      prefecture,
      location: range.location,
      phone: range.phone,
      defaultPurpose: range.defaultPurpose,
    };
  });
}

export function loadRangeCatalog(): CatalogEntry[] {
  cachedEntries ??= buildEntries();
  return cachedEntries;
}

export function getRangeCatalogEntry({
  catalogId,
}: {
  catalogId: string;
}): CatalogEntry | undefined {
  if (!cachedById) {
    cachedById = new Map(loadRangeCatalog().map((entry) => [entry.catalogId, entry]));
  }

  return cachedById.get(catalogId);
}

export function loadRangeCatalogByPrefecture() {
  return groupCatalogByPrefecture({ entries: loadRangeCatalog() });
}
