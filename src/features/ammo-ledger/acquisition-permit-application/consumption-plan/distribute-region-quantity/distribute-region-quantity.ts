import { distributeEvenlyAcrossSlots } from "../partition-quantity/partition-quantity";
import type { PlanPeriod } from "../plan-period/plan-period";
import {
  buildBalancedPeriodSlots,
  resolveMaxSlotsPerPeriod,
} from "../plan-period-slot-assignment/plan-period-slot-assignment";

/** 区間内で合計をできるだけ均等に配分する（1区間1回を基本に、足りなければ同一区間2回目） */
export function distributeQuantityInRegionWithStablePace({
  periods,
  totalQuantity,
  maxPerPeriod,
  consumptionUnit,
}: {
  periods: PlanPeriod[];
  totalQuantity: number;
  maxPerPeriod: number;
  consumptionUnit: number;
}): Array<{ period: PlanPeriod; quantity: number }> {
  if (periods.length === 0 || totalQuantity <= 0) {
    return [];
  }

  const minimumEvenMax =
    Math.ceil(totalQuantity / periods.length / consumptionUnit) * consumptionUnit;
  const singleSlotQuantities = distributeEvenlyAcrossSlots({
    slotCount: periods.length,
    totalQuantity,
    maxPerSlot: Math.max(maxPerPeriod, minimumEvenMax),
    unit: consumptionUnit,
  });
  const singleSlotAssigned = singleSlotQuantities.reduce((sum, quantity) => sum + quantity, 0);

  if (singleSlotAssigned >= totalQuantity) {
    return periods.flatMap((period, index) => {
      const quantity = singleSlotQuantities[index] ?? 0;
      if (quantity <= 0) {
        return [];
      }
      return [{ period, quantity }];
    });
  }

  let maxSlotsPerPeriod = 1;
  let slotPeriods: PlanPeriod[] = [];
  let quantities: number[] = [];

  while (maxSlotsPerPeriod <= totalQuantity / consumptionUnit + periods.length) {
    const eventCount = Math.max(1, Math.ceil(totalQuantity / maxPerPeriod));
    maxSlotsPerPeriod = resolveMaxSlotsPerPeriod({
      periodCount: periods.length,
      eventCount,
      initialMax: maxSlotsPerPeriod,
    });
    slotPeriods = buildBalancedPeriodSlots({
      periods,
      slotCount: eventCount,
      maxSlotsPerPeriod,
    });

    const effectiveMax = Math.max(
      maxPerPeriod,
      Math.ceil(totalQuantity / slotPeriods.length / consumptionUnit) * consumptionUnit,
    );

    quantities = distributeEvenlyAcrossSlots({
      slotCount: slotPeriods.length,
      totalQuantity,
      maxPerSlot: effectiveMax,
      unit: consumptionUnit,
    });

    const assigned = quantities.reduce((sum, quantity) => sum + quantity, 0);
    if (assigned >= totalQuantity) {
      break;
    }

    maxSlotsPerPeriod += 1;
  }

  return slotPeriods.flatMap((period, index) => {
    const quantity = quantities[index] ?? 0;
    if (quantity <= 0) {
      return [];
    }
    return [{ period, quantity }];
  });
}
