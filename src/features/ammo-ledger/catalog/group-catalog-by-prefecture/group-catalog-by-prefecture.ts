import { comparePrefectures } from "@/features/ammo-ledger/catalog/prefecture-order/prefecture-order";
import type {
  CatalogEntry,
  CatalogPrefectureGroup,
} from "@/features/ammo-ledger/catalog/schema/catalog-entry";

export function groupCatalogByPrefecture({
  entries,
}: {
  entries: CatalogEntry[];
}): CatalogPrefectureGroup[] {
  const groups = new Map<string, CatalogEntry[]>();

  for (const entry of entries) {
    const bucket = groups.get(entry.prefecture) ?? [];
    bucket.push(entry);
    groups.set(entry.prefecture, bucket);
  }

  return [...groups.entries()]
    .sort(([left], [right]) => comparePrefectures({ left, right }))
    .map(([prefecture, prefectureEntries]) => ({
      prefecture,
      entries: prefectureEntries.sort((left, right) => left.name.localeCompare(right.name, "ja")),
    }));
}
