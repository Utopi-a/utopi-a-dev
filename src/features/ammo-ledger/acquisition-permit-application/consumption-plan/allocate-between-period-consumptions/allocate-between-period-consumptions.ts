import type { AcquisitionEvent } from "../consumption-plan-types";
import { distributeQuantityInRegionWithStablePace } from "../distribute-region-quantity/distribute-region-quantity";
import { comparePlanPeriod, type PlanPeriod } from "../plan-period/plan-period";

export type PurchaseGap = {
  periods: PlanPeriod[];
};

export type ConsumptionRegion = {
  periods: PlanPeriod[];
  /** この区間の直後に来る購入の index（sorted acquisitions 基準） */
  acquisitionIndex: number;
};

export function computeAssignableCapacity({
  periods,
  maxPerPeriod,
  maxEventsPerPeriod = 1,
}: {
  periods: PlanPeriod[];
  maxPerPeriod: number;
  maxEventsPerPeriod?: number;
}): number {
  return periods.length * maxPerPeriod * maxEventsPerPeriod;
}

export function buildPurchaseGaps({
  acquisitions,
  availablePeriods,
}: {
  acquisitions: AcquisitionEvent[];
  availablePeriods: PlanPeriod[];
}): PurchaseGap[] {
  return buildConsumptionRegions({ acquisitions, availablePeriods })
    .filter((region) => region.acquisitionIndex > 0)
    .map((region) => ({ periods: region.periods }));
}

/** 各購入の直前区間（購入を含む同一上中下旬も可）を列挙する */
export function buildConsumptionRegions({
  acquisitions,
  availablePeriods,
}: {
  acquisitions: AcquisitionEvent[];
  availablePeriods: PlanPeriod[];
}): ConsumptionRegion[] {
  if (acquisitions.length === 0) {
    return [];
  }

  const sortedAcquisitions = [...acquisitions].sort((a, b) =>
    comparePlanPeriod({ a: a.scheduledPeriod, b: b.scheduledPeriod }),
  );

  const regions: ConsumptionRegion[] = [];

  for (const [acquisitionIndex, acquisition] of sortedAcquisitions.entries()) {
    const previous = sortedAcquisitions[acquisitionIndex - 1];

    regions.push({
      acquisitionIndex,
      periods: availablePeriods.filter((period) => {
        if (previous && comparePlanPeriod({ a: period, b: previous.scheduledPeriod }) <= 0) {
          return false;
        }
        return comparePlanPeriod({ a: period, b: acquisition.scheduledPeriod }) <= 0;
      }),
    });
  }

  return regions;
}

/** 許可期間の上中下旬に消費を均等配分する（1区間1回を基本、足りなければ2回目） */
export function allocateConsumptionAcrossPlanPeriods({
  periods,
  shootingQuantity,
  maxPerPeriod,
  consumptionUnit,
}: {
  periods: PlanPeriod[];
  shootingQuantity: number;
  maxPerPeriod: number;
  consumptionUnit: number;
}): Array<{ period: PlanPeriod; quantity: number }> {
  if (periods.length === 0 || shootingQuantity <= 0) {
    return [];
  }

  return distributeQuantityInRegionWithStablePace({
    periods,
    totalQuantity: shootingQuantity,
    maxPerPeriod,
    consumptionUnit,
  });
}

/** @deprecated 購入間のみ。allocateConsumptionAcrossPlanPeriods を優先 */
export function allocateConsumptionAcrossPurchaseGaps({
  gaps,
  shootingQuantity,
  maxPerPeriod,
  consumptionUnit,
}: {
  gaps: PurchaseGap[];
  shootingQuantity: number;
  maxPerPeriod: number;
  consumptionUnit: number;
}): Array<{ period: PlanPeriod; quantity: number }> {
  const periods = gaps.flatMap((gap) => gap.periods);
  return allocateConsumptionAcrossPlanPeriods({
    periods,
    shootingQuantity,
    maxPerPeriod,
    consumptionUnit,
  });
}

export function distributeQuotaInGap({
  periods,
  quota,
  maxPerPeriod,
  consumptionUnit,
}: {
  periods: PlanPeriod[];
  quota: number;
  maxPerPeriod: number;
  consumptionUnit: number;
}): Array<{ period: PlanPeriod; quantity: number }> {
  return distributeQuantityInRegionWithStablePace({
    periods,
    totalQuantity: quota,
    maxPerPeriod,
    consumptionUnit,
  });
}
