import type { CartridgeType } from "./cartridge-type";
import { cartridgeTypeLabels } from "./cartridge-type";
import { formatGaugeNumberForDisplay } from "./shot-gauge-options";

export function buildAmmoTypeLabel({
  name,
  caliber,
  cartridgeType,
  gaugeNumber,
}: {
  name?: string;
  caliber: string;
  cartridgeType: CartridgeType;
  gaugeNumber?: string;
}): string {
  if (name?.trim()) {
    const base = name.trim();
    if (cartridgeType === "shotgun_shot") {
      const displayGauge = formatGaugeNumberForDisplay({ gaugeNumber });
      if (displayGauge && !base.endsWith(`${displayGauge}号`)) {
        return `${base} ${displayGauge}号`;
      }
    }
    return base;
  }

  if (cartridgeType === "rifle") {
    return caliber;
  }

  const parts = [caliber, cartridgeTypeLabels[cartridgeType]];
  if (cartridgeType === "shotgun_shot") {
    const displayGauge = formatGaugeNumberForDisplay({ gaugeNumber });
    if (displayGauge) {
      parts.push(`${displayGauge}号`);
    }
  }
  return parts.join(" ");
}
