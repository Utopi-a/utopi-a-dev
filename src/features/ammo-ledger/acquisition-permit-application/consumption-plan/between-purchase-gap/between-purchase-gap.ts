import type { AcquisitionEvent } from "../consumption-plan-types";
import { comparePlanPeriod, type PlanPeriod } from "../plan-period/plan-period";

export type BetweenPurchaseGap = {
  periods: PlanPeriod[];
  /** この隙間の後に来る購入（sorted acquisitions 基準） */
  followingAcquisitionIndex: number;
};

/** 購入と購入の間（厳密）の上中下旬。空なら次の購入区間をフォールバック */
export function buildStrictBetweenPurchaseGaps({
  acquisitions,
  availablePeriods,
}: {
  acquisitions: AcquisitionEvent[];
  availablePeriods: PlanPeriod[];
}): BetweenPurchaseGap[] {
  if (acquisitions.length <= 1) {
    return [];
  }

  const sortedAcquisitions = [...acquisitions].sort((a, b) =>
    comparePlanPeriod({ a: a.scheduledPeriod, b: b.scheduledPeriod }),
  );

  const gaps: BetweenPurchaseGap[] = [];

  for (let index = 0; index < sortedAcquisitions.length - 1; index += 1) {
    const current = sortedAcquisitions[index];
    const next = sortedAcquisitions[index + 1];

    const strictBetween = availablePeriods.filter(
      (period) =>
        comparePlanPeriod({ a: current.scheduledPeriod, b: period }) < 0 &&
        comparePlanPeriod({ a: period, b: next.scheduledPeriod }) < 0,
    );

    gaps.push({
      followingAcquisitionIndex: index + 1,
      periods: strictBetween.length > 0 ? strictBetween : [next.scheduledPeriod],
    });
  }

  return gaps;
}

/** 最初の購入より前の上中下旬 */
export function buildBeforeFirstAcquisitionPeriods({
  acquisitions,
  availablePeriods,
}: {
  acquisitions: AcquisitionEvent[];
  availablePeriods: PlanPeriod[];
}): PlanPeriod[] {
  if (acquisitions.length === 0) {
    return [];
  }

  const first = [...acquisitions].sort((a, b) =>
    comparePlanPeriod({ a: a.scheduledPeriod, b: b.scheduledPeriod }),
  )[0];

  return availablePeriods.filter(
    (period) => comparePlanPeriod({ a: period, b: first.scheduledPeriod }) < 0,
  );
}

/** 块数に応じて隙間内の配置区間を選ぶ（同一区間への重複は避ける） */
export function pickPeriodsForGapChunks({
  periods,
  chunkCount,
}: {
  periods: PlanPeriod[];
  chunkCount: number;
}): PlanPeriod[] {
  if (periods.length === 0 || chunkCount <= 0) {
    return [];
  }

  if (chunkCount === 1) {
    return [periods[Math.floor((periods.length - 1) / 2)]];
  }

  if (periods.length === 1) {
    return [periods[0]];
  }

  const firstIndex = Math.floor((periods.length - 1) / 3);
  const secondIndex = Math.floor(((periods.length - 1) * 2) / 3);

  if (firstIndex === secondIndex) {
    return [periods[firstIndex]];
  }

  return [periods[firstIndex], periods[secondIndex]];
}

export function allocateQuotaAcrossGaps({
  gaps,
  totalQuantity,
  consumptionUnit,
}: {
  gaps: BetweenPurchaseGap[];
  totalQuantity: number;
  consumptionUnit: number;
}): number[] {
  if (gaps.length === 0 || totalQuantity <= 0) {
    return [];
  }

  const totalSlotCount = gaps.reduce((sum, gap) => sum + Math.max(1, gap.periods.length), 0);
  const exactShares = gaps.map(
    (gap) => (totalQuantity * Math.max(1, gap.periods.length)) / totalSlotCount,
  );

  const quotas = exactShares.map((share) => Math.floor(share / consumptionUnit) * consumptionUnit);
  const assigned = quotas.reduce((sum, quota) => sum + quota, 0);
  let remainingUnits = (totalQuantity - assigned) / consumptionUnit;

  const rankedByFraction = exactShares
    .map((share, index) => ({
      index,
      fraction: share - quotas[index],
    }))
    .sort((a, b) => b.fraction - a.fraction);

  let rankCursor = 0;
  while (remainingUnits > 0 && rankCursor < rankedByFraction.length * totalSlotCount) {
    const { index } = rankedByFraction[rankCursor % rankedByFraction.length];
    quotas[index] += consumptionUnit;
    remainingUnits -= 1;
    rankCursor += 1;
  }

  return rebalanceQuotasToTarget({
    quotas,
    target: totalQuantity,
    consumptionUnit,
  });
}

function rebalanceQuotasToTarget({
  quotas,
  target,
  consumptionUnit,
}: {
  quotas: number[];
  target: number;
  consumptionUnit: number;
}): number[] {
  const mutable = [...quotas];
  let assigned = mutable.reduce((sum, quota) => sum + quota, 0);

  while (assigned < target) {
    const candidateIndex = mutable.findIndex(
      (quota) => quota + consumptionUnit <= target - assigned + quota,
    );
    if (candidateIndex < 0) {
      const fallbackIndex = mutable.indexOf(Math.min(...mutable));
      mutable[fallbackIndex] += consumptionUnit;
      assigned += consumptionUnit;
      continue;
    }
    mutable[candidateIndex] += consumptionUnit;
    assigned += consumptionUnit;
  }

  while (assigned > target) {
    const candidateIndex = mutable.findIndex((quota) => quota >= consumptionUnit);
    if (candidateIndex < 0) {
      break;
    }
    mutable[candidateIndex] -= consumptionUnit;
    assigned -= consumptionUnit;
  }

  return mutable;
}
