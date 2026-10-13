import type { AcquisitionPermitName } from "@/features/ammo-ledger/schema/acquisition-permit-name-options";

/**
 * 申請書に重ねて印刷できる火薬類の名称。
 * 様式の名称・数量欄のうち印字位置を持つのは実包の列だけなので、
 * 空包・銃用雷管・無煙火薬・黒色猟用火薬を選ぶと実包の欄に印字されてしまう。
 */
export const applicationAmmoNameOptions = [
  "12番",
  "20番",
  "410番",
  "実包（ライフル）",
] as const satisfies readonly AcquisitionPermitName[];

export type ApplicationAmmoName = (typeof applicationAmmoNameOptions)[number];

export const defaultApplicationAmmoName: ApplicationAmmoName = "12番";

export type AmmoTypeStock = {
  cartridgeType: string;
  caliber: string;
  bookStock: number;
};

function isAmmoTypeOfName({
  ammoName,
  cartridgeType,
  caliber,
}: {
  ammoName: ApplicationAmmoName;
  cartridgeType: string;
  caliber: string;
}): boolean {
  if (cartridgeType === "rifle") {
    return ammoName === "実包（ライフル）";
  }
  // 番径は手入力なので、全角数字や空白の違いでは別の名称として扱わない。
  return caliber.normalize("NFKC").replace(/\s/g, "") === ammoName;
}

/** 様式の備考どおり、現に保有している数量は申請する名称に当たる弾種だけを合計する。 */
export function sumHomeStockForAmmoName({
  ammoName,
  ammoTypeStocks,
}: {
  ammoName: ApplicationAmmoName;
  ammoTypeStocks: AmmoTypeStock[];
}): number {
  const total = ammoTypeStocks
    .filter((stock) => isAmmoTypeOfName({ ammoName, ...stock }))
    .reduce((sum, stock) => sum + stock.bookStock, 0);
  return Math.max(0, total);
}
