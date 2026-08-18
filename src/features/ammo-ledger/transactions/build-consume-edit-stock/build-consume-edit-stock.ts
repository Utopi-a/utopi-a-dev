export function buildConsumeEditStock({
  bookStockByAmmoTypeId,
  originalAmmoTypeId,
  originalQuantity,
}: {
  bookStockByAmmoTypeId: Record<string, number>;
  originalAmmoTypeId: string;
  originalQuantity: number;
}): Record<string, number> {
  return {
    ...bookStockByAmmoTypeId,
    [originalAmmoTypeId]: (bookStockByAmmoTypeId[originalAmmoTypeId] ?? 0) + originalQuantity,
  };
}
