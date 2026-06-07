import type { AcquisitionEvent, ConsumptionEvent } from "../consumption-plan-types";
import { splitIntoUnitMultiples } from "../partition-quantity/partition-quantity";
import {
  comparePlanPeriod,
  distributePlanPeriodsEvenly,
  listPlanPeriodsInRange,
  type PlanPeriod,
} from "../plan-period/plan-period";
import {
  buildBalancedPeriodSlots,
  resolveMaxSlotsPerPeriod,
} from "../plan-period-slot-assignment/plan-period-slot-assignment";

export const maxPurchasePerEvent = 500;

export function choosePurchaseAmount({
  need,
  remaining,
  room,
  purchaseUnit = 250,
  maxPurchase = maxPurchasePerEvent,
}: {
  need: number;
  remaining: number;
  room: number;
  purchaseUnit?: number;
  maxPurchase?: number;
}): number {
  if (remaining <= 0 || room < purchaseUnit) {
    return 0;
  }

  const cap = Math.min(maxPurchase, remaining, Math.floor(room / purchaseUnit) * purchaseUnit);
  if (cap < purchaseUnit) {
    return 0;
  }

  if (need <= 0) {
    return cap >= maxPurchase ? maxPurchase : purchaseUnit;
  }

  const minRequired = Math.ceil(need / purchaseUnit) * purchaseUnit;

  if (minRequired > cap) {
    return cap;
  }

  if (cap >= maxPurchase) {
    return maxPurchase;
  }

  return Math.min(minRequired, cap);
}

/** 500（不可なら250）発単位で、期間内にまんべんなく購入する */
export function scheduleAcquisitions({
  requestedQuantity,
  periodFrom,
  periodTo,
  initialStock: _initialStock,
  homeStorageLimit: _homeStorageLimit,
  purchaseUnit = 250,
}: {
  requestedQuantity: number;
  periodFrom: string;
  periodTo: string;
  initialStock: number;
  homeStorageLimit: number;
  purchaseUnit?: number;
}): AcquisitionEvent[] {
  if (requestedQuantity <= 0) {
    return [];
  }

  const chunks = splitIntoPurchaseChunks({
    totalQuantity: requestedQuantity,
    purchaseUnit,
    maxChunk: maxPurchasePerEvent,
  });

  const purchasePeriods = pickPurchasePeriods({
    periodFrom,
    periodTo,
    count: chunks.length,
  });

  return purchasePeriods.map((scheduledPeriod, index) => ({
    scheduledPeriod,
    quantity: chunks[index],
  }));
}

export function splitIntoPurchaseChunks({
  totalQuantity,
  purchaseUnit,
  maxChunk,
}: {
  totalQuantity: number;
  purchaseUnit: number;
  maxChunk: number;
}): number[] {
  const chunks: number[] = [];
  let remaining = totalQuantity;

  while (remaining > 0) {
    if (remaining >= maxChunk) {
      chunks.push(maxChunk);
      remaining -= maxChunk;
      continue;
    }

    if (remaining >= purchaseUnit) {
      chunks.push(remaining);
      remaining = 0;
      continue;
    }

    break;
  }

  return chunks;
}

function pickPurchasePeriods({
  periodFrom,
  periodTo,
  count,
}: {
  periodFrom: string;
  periodTo: string;
  count: number;
}): PlanPeriod[] {
  const allPeriods = listPlanPeriodsInRange({ from: periodFrom, to: periodTo });
  if (allPeriods.length === 0 || count <= 0) {
    return [];
  }

  if (count <= allPeriods.length) {
    if (count === 1) {
      return [allPeriods[0]];
    }
    return distributePlanPeriodsEvenly({
      from: periodFrom,
      to: periodTo,
      count,
    });
  }

  // 枠が足りない場合のみ同一区間に2回目以降
  const maxSlotsPerPeriod = resolveMaxSlotsPerPeriod({
    periodCount: allPeriods.length,
    eventCount: count,
  });

  return buildBalancedPeriodSlots({
    periods: allPeriods,
    slotCount: count,
    maxSlotsPerPeriod,
  });
}

export function hasConsecutivePurchasesWithoutConsumption({
  acquisitions,
  consumptions,
}: {
  acquisitions: AcquisitionEvent[];
  consumptions: ConsumptionEvent[];
}): boolean {
  if (acquisitions.length <= 1) {
    return false;
  }

  const sortedAcquisitions = [...acquisitions].sort((a, b) =>
    comparePlanPeriod({ a: a.scheduledPeriod, b: b.scheduledPeriod }),
  );

  for (let index = 0; index < sortedAcquisitions.length - 1; index += 1) {
    const current = sortedAcquisitions[index];
    const next = sortedAcquisitions[index + 1];

    const hasConsumptionBetween = consumptions.some((event) => {
      const afterCurrent =
        comparePlanPeriod({ a: current.scheduledPeriod, b: event.scheduledPeriod }) <= 0;
      const beforeNext =
        comparePlanPeriod({ a: event.scheduledPeriod, b: next.scheduledPeriod }) <= 0;
      return afterCurrent && beforeNext;
    });

    if (!hasConsumptionBetween) {
      return true;
    }
  }

  return false;
}
