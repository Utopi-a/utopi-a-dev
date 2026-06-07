import { normalizePrefecture } from "@/features/ammo-ledger/range-seed/resolve-range-addresses/normalize-prefecture";

export function buildRangeCatalogId({
  name,
  prefecture,
}: {
  name: string;
  prefecture: string;
}): string {
  const normalizedPrefecture = normalizePrefecture({ prefecture });
  return `range:${normalizedPrefecture}:${name}`;
}
