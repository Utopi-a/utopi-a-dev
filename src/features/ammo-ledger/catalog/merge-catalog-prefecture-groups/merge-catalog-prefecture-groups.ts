import { comparePrefectures } from "@/features/ammo-ledger/catalog/prefecture-order/prefecture-order";
import type {
  CatalogEntry,
  CatalogPrefectureGroup,
  CatalogSource,
} from "@/features/ammo-ledger/catalog/schema/catalog-entry";

function tagCatalogSource({
  entries,
  catalogSource,
}: {
  entries: CatalogEntry[];
  catalogSource: CatalogSource;
}): CatalogEntry[] {
  return entries.map((entry) => ({ ...entry, catalogSource }));
}

export function mergeCatalogPrefectureGroups({
  gunShopGroups,
  rangeGroups,
}: {
  gunShopGroups: CatalogPrefectureGroup[];
  rangeGroups: CatalogPrefectureGroup[];
}): CatalogPrefectureGroup[] {
  const groups = new Map<string, { gunShops: CatalogEntry[]; ranges: CatalogEntry[] }>();

  for (const group of gunShopGroups) {
    const bucket = groups.get(group.prefecture) ?? { gunShops: [], ranges: [] };
    bucket.gunShops = tagCatalogSource({ entries: group.entries, catalogSource: "gun_shop" });
    groups.set(group.prefecture, bucket);
  }

  for (const group of rangeGroups) {
    const bucket = groups.get(group.prefecture) ?? { gunShops: [], ranges: [] };
    bucket.ranges = tagCatalogSource({ entries: group.entries, catalogSource: "range" });
    groups.set(group.prefecture, bucket);
  }

  return [...groups.entries()]
    .sort(([left], [right]) => comparePrefectures({ left, right }))
    .map(([prefecture, bucket]) => ({
      prefecture,
      entries: [...bucket.gunShops, ...bucket.ranges].sort((left, right) =>
        left.name.localeCompare(right.name, "ja"),
      ),
    }));
}
