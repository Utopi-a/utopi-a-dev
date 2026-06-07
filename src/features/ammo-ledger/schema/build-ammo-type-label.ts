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
  const displayGauge = formatGaugeNumberForDisplay({ gaugeNumber });
  const gaugeSuffix = displayGauge ? `${displayGauge}号` : null;

  if (name?.trim()) {
    const base = name.trim();
    if (gaugeSuffix) {
      return `${base} ${gaugeSuffix}`;
    }
    return base;
  }

  const parts = [caliber, shotTypeLabels[shotType]];
  if (gaugeSuffix) {
    parts.push(gaugeSuffix);
  }
  return parts.join(" ");
}
