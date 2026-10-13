import { buildAmmoTypeLabel } from "./build-ammo-type-label";
import type { CartridgeType } from "./cartridge-type";
import { formatGaugeNumberForDisplay } from "./shot-gauge-options";

/**
 * 保存済みの弾種名から、利用者が付けた名称の部分だけを取り出す。名称が空欄なら空文字を返す。
 * 保存時に名称が空欄なら属性から名前を作り、散弾は名称の後ろに号数を付けて保存している。
 * 保存済みの名前をそのまま名称として扱うと、番径や号数を変えたときに古い値が名前に残るため。
 */
export function extractCustomAmmoTypeName({
  name,
  caliber,
  cartridgeType,
  gaugeNumber,
}: {
  name: string;
  caliber: string;
  cartridgeType: CartridgeType;
  gaugeNumber?: string | null;
}): string {
  const shotGaugeNumber = cartridgeType === "shotgun_shot" ? (gaugeNumber ?? undefined) : undefined;
  if (name === buildAmmoTypeLabel({ caliber, cartridgeType, gaugeNumber: shotGaugeNumber })) {
    return "";
  }

  const displayGauge = formatGaugeNumberForDisplay({ gaugeNumber: shotGaugeNumber });
  const gaugeSuffix = ` ${displayGauge}号`;
  if (displayGauge && name.endsWith(gaugeSuffix)) {
    return name.slice(0, -gaugeSuffix.length);
  }
  return name;
}
