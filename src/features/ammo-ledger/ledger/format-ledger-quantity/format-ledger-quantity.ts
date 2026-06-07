import type { LedgerDisplayRow } from "@/features/ammo-ledger/ledger/build-ledger-display-rows/build-ledger-display-rows";
import type { LedgerCategory } from "@/features/ammo-ledger/schema/ledger-category";

export function showsAmmoQuantity({ row }: { row: LedgerDisplayRow }): boolean {
  return row.kind === "entry";
}

export function formatAmmoQuantity({ quantity }: { quantity: number }): string {
  return `${quantity}発`;
}

export function formatPermitBalance({ balance }: { balance: number }): string {
  return `${balance}個`;
}

export function formatStockQuantity({ quantity }: { quantity: number }): string {
  return `${quantity.toLocaleString("ja-JP")}個`;
}

export function formatEntryAmmoQuantityLabel({ category }: { category: LedgerCategory }): string {
  if (category === "carryover") {
    return "繰越残数";
  }

  return "数量";
}
