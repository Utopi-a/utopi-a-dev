import { classifyLedgerEntryFlow } from "@/features/ammo-ledger/documents/classify-ledger-entry-flow/classify-ledger-entry-flow";
import type { LedgerCategory } from "@/features/ammo-ledger/schema/ledger-category";

/** 帳簿・残弾の数は法定帳簿にあわせて「個」で、桁区切りをつけて表示する */
export function formatStockQuantity({ quantity }: { quantity: number }): string {
  return `${quantity.toLocaleString("ja-JP")}個`;
}

export function formatPermitBalance({ balance }: { balance: number }): string {
  return formatStockQuantity({ quantity: balance });
}

/** 受入は「+」、払出は「−」をつける。繰越は残数そのものなので符号をつけない */
export function formatEntryQuantity({
  category,
  quantity,
}: {
  category: string;
  quantity: number;
}): string {
  const absQuantity = formatStockQuantity({ quantity: Math.abs(quantity) });
  if (category === "carryover") {
    return absQuantity;
  }
  return classifyLedgerEntryFlow({ category, quantity }) === "receive"
    ? `+${absQuantity}`
    : `−${absQuantity}`;
}

export function formatEntryAmmoQuantityLabel({ category }: { category: LedgerCategory }): string {
  if (category === "carryover") {
    return "繰越残数";
  }

  return "数量";
}
