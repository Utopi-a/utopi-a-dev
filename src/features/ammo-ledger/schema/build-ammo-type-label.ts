import { formatGaugeNumberForDisplay } from "./shot-gauge-options";
import type { ShotType } from "./shot-type";
import { shotTypeLabels } from "./shot-type";

export function buildAmmoTypeLabel({
  name,
  caliber,
  shotType,
  gaugeNumber,
}: {
  name?: string;
  caliber: string;
  shotType: ShotType;
  gaugeNumber?: string;
}): string {
  if (name?.trim()) {
    return name.trim();
  }

  const parts = [caliber, shotTypeLabels[shotType]];
  const displayGauge = formatGaugeNumberForDisplay({ gaugeNumber });
  if (displayGauge) {
    parts.push(`${displayGauge}号`);
  }
  return parts.join(" ");
}
