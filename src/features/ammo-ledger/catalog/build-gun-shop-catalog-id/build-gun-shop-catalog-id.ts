export function buildGunShopCatalogId({ listNumber }: { listNumber: number }): string {
  return `shop:${listNumber}`;
}
