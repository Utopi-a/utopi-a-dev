import { splitGapConsumptionQuantity } from "../consumption-chunk-size/consumption-chunk-size";
import {
  compareTimelinePosition,
  isConsumptionBetweenAcquisitions,
  sortAcquisitions,
} from "../consumption-plan-timeline/consumption-plan-timeline";
import type {
  AcquisitionEvent,
  ConsumptionEvent,
  RangeAllocation,
} from "../consumption-plan-types";
import {
  comparePlanPeriod,
  type PlanPeriod,
  serializePlanPeriodKey,
} from "../plan-period/plan-period";

export type ScheduledConsumptions = {
  shootingConsumptions: ConsumptionEvent[];
  bufferConsumptions: ConsumptionEvent[];
};

const maxConsumptionsBeforePurchase = 2;
const maxConsumptionPerEvent = 500;

/** 各購入の直後に消費を置き、購入・消費・購入・消費…の交互配置を保つ */
export function scheduleConsumptionsFromAcquisitions({
  acquisitions,
  requestedQuantity: _requestedQuantity,
  shootingQuantity,
  bufferNeedByAcquisition,
  periodFrom: _periodFrom,
  periodTo: _periodTo,
  rangeAllocations,
  consumptionUnit = 25,
}: {
  acquisitions: AcquisitionEvent[];
  requestedQuantity: number;
  shootingQuantity: number;
  bufferNeedByAcquisition: number[];
  periodFrom: string;
  periodTo: string;
  rangeAllocations: RangeAllocation[];
  consumptionUnit?: number;
}): ScheduledConsumptions {
  if (shootingQuantity <= 0 && bufferNeedByAcquisition.every((need) => need <= 0)) {
    return { shootingConsumptions: [], bufferConsumptions: [] };
  }

  if (rangeAllocations.length === 0) {
    return { shootingConsumptions: [], bufferConsumptions: [] };
  }

  if (shootingQuantity % consumptionUnit !== 0) {
    throw new Error("shootingQuantity must be a multiple of consumptionUnit");
  }

  const sortedAcquisitions = sortAcquisitions({ acquisitions });
  if (sortedAcquisitions.length === 0) {
    return { shootingConsumptions: [], bufferConsumptions: [] };
  }

  const shootingBySlot = distributeShootingAcrossSlots({
    slotCount: sortedAcquisitions.length,
    shootingQuantity,
    consumptionUnit,
  });

  const primaryRange = rangeAllocations[0];
  const quantityByRange = allocateQuantityByWeight({
    totalQuantity: shootingQuantity,
    consumptionUnit,
    rangeAllocations,
  });
  const remainingByRange = new Map(
    quantityByRange.map((allocation) => [allocation.rangeId, allocation.quantity]),
  );

  const bufferConsumptions: ConsumptionEvent[] = [];
  const shootingConsumptions: ConsumptionEvent[] = [];

  for (const [index, acquisition] of sortedAcquisitions.entries()) {
    const bufferPart = bufferNeedByAcquisition[index] ?? 0;
    const shootingPart = shootingBySlot[index] ?? 0;
    const slotTotal = bufferPart + shootingPart;

    if (slotTotal <= 0) {
      continue;
    }

    const chunks = splitGapConsumptionQuantity({
      gapTotal: slotTotal,
      consumptionUnit,
      maxEventsPerGap: maxConsumptionsBeforePurchase,
      preferredBatchSize: Math.min(maxConsumptionPerEvent, slotTotal),
      maxPerEvent: maxConsumptionPerEvent,
    });

    let bufferLeft = bufferPart;
    let shootingLeft = shootingPart;

    for (const [eventSequence, quantity] of chunks.entries()) {
      const bufferQuantity = Math.min(bufferLeft, quantity);
      const shootingQuantityPart = quantity - bufferQuantity;

      if (bufferQuantity > 0) {
        bufferConsumptions.push({
          scheduledPeriod: acquisition.scheduledPeriod,
          slotSequence: acquisition.slotSequence,
          eventSequence,
          quantity: bufferQuantity,
          rangeId: primaryRange.rangeId,
          rangeName: primaryRange.rangeName,
          rangeAddress: primaryRange.rangeAddress,
          purpose: primaryRange.purpose,
        });
        bufferLeft -= bufferQuantity;
      }

      if (shootingQuantityPart > 0) {
        const range = pickRangeWithRemaining({
          remainingByRange,
          rangeAllocations,
        });
        if (!range) {
          continue;
        }

        remainingByRange.set(
          range.rangeId,
          (remainingByRange.get(range.rangeId) ?? 0) - shootingQuantityPart,
        );

        shootingConsumptions.push({
          scheduledPeriod: acquisition.scheduledPeriod,
          slotSequence: acquisition.slotSequence,
          eventSequence,
          quantity: shootingQuantityPart,
          rangeId: range.rangeId,
          rangeName: range.rangeName,
          rangeAddress: range.rangeAddress,
          purpose: range.purpose,
        });
        shootingLeft -= shootingQuantityPart;
      }
    }

    if (bufferLeft > 0 || shootingLeft > 0) {
      throw new Error("failed to allocate consumption before purchase");
    }
  }

  return {
    shootingConsumptions: sortConsumptionEvents({ events: shootingConsumptions }),
    bufferConsumptions: sortConsumptionEvents({ events: bufferConsumptions }),
  };
}

function distributeShootingAcrossSlots({
  slotCount,
  shootingQuantity,
  consumptionUnit,
}: {
  slotCount: number;
  shootingQuantity: number;
  consumptionUnit: number;
}): number[] {
  if (slotCount <= 0) {
    return [];
  }

  const base = Math.floor(shootingQuantity / slotCount / consumptionUnit) * consumptionUnit;
  const quotas = Array.from({ length: slotCount }, () => base);
  let remaining = shootingQuantity - base * slotCount;

  for (let index = 0; remaining > 0; index += 1) {
    quotas[index % slotCount] += consumptionUnit;
    remaining -= consumptionUnit;
  }

  return quotas;
}

function sortConsumptionEvents({ events }: { events: ConsumptionEvent[] }): ConsumptionEvent[] {
  return [...events].sort((a, b) =>
    compareTimelinePosition({
      a: { ...a, kind: "consumption" },
      b: { ...b, kind: "consumption" },
    }),
  );
}

function pickRangeWithRemaining({
  remainingByRange,
  rangeAllocations,
}: {
  remainingByRange: Map<string, number>;
  rangeAllocations: RangeAllocation[];
}): RangeAllocation | null {
  const candidates = rangeAllocations
    .map((allocation) => ({
      allocation,
      remaining: remainingByRange.get(allocation.rangeId) ?? 0,
    }))
    .filter(({ remaining }) => remaining > 0)
    .sort((a, b) => b.remaining - a.remaining);

  return candidates[0]?.allocation ?? null;
}

function allocateQuantityByWeight({
  totalQuantity,
  consumptionUnit,
  rangeAllocations,
}: {
  totalQuantity: number;
  consumptionUnit: number;
  rangeAllocations: RangeAllocation[];
}): Array<RangeAllocation & { quantity: number }> {
  const totalWeight = rangeAllocations.reduce((sum, item) => sum + item.weight, 0);
  if (totalWeight <= 0) {
    throw new Error("rangeAllocations must have positive total weight");
  }

  const unitCount = totalQuantity / consumptionUnit;

  const raw = rangeAllocations.map((allocation) => {
    const exact = (unitCount * allocation.weight) / totalWeight;
    return {
      ...allocation,
      units: Math.floor(exact),
      remainder: exact - Math.floor(exact),
    };
  });

  let assignedUnits = raw.reduce((sum, item) => sum + item.units, 0);
  const sortedByRemainder = [...raw].sort((a, b) => b.remainder - a.remainder);

  for (const item of sortedByRemainder) {
    if (assignedUnits >= unitCount) {
      break;
    }
    item.units += 1;
    assignedUnits += 1;
  }

  return raw.map(({ units, remainder: _remainder, ...allocation }) => ({
    ...allocation,
    quantity: units * consumptionUnit,
  }));
}

export function collectPeriodsBetweenPurchases({
  acquisitions,
  availablePeriods,
}: {
  acquisitions: AcquisitionEvent[];
  availablePeriods: PlanPeriod[];
}): PlanPeriod[] {
  const sortedAcquisitions = sortAcquisitions({ acquisitions });
  if (sortedAcquisitions.length <= 1) {
    return [];
  }

  const periods: PlanPeriod[] = [];

  for (let index = 0; index < sortedAcquisitions.length - 1; index += 1) {
    const current = sortedAcquisitions[index];
    const next = sortedAcquisitions[index + 1];

    const strictBetween = availablePeriods.filter(
      (period) =>
        comparePlanPeriod({ a: current.scheduledPeriod, b: period }) < 0 &&
        comparePlanPeriod({ a: period, b: next.scheduledPeriod }) < 0,
    );

    if (strictBetween.length > 0) {
      periods.push(...strictBetween);
      continue;
    }

    periods.push(next.scheduledPeriod);
  }

  return periods;
}

export function isPeriodBetweenPurchases({
  period,
  acquisitions,
  availablePeriods,
}: {
  period: PlanPeriod;
  acquisitions: AcquisitionEvent[];
  availablePeriods: PlanPeriod[];
}): boolean {
  const betweenPeriods = collectPeriodsBetweenPurchases({ acquisitions, availablePeriods });
  const periodKey = serializePlanPeriodKey({ period });
  return betweenPeriods.some(
    (candidate) => serializePlanPeriodKey({ period: candidate }) === periodKey,
  );
}

export function countConsumptionsBetweenPurchases({
  consumptions,
  acquisitions,
}: {
  consumptions: ConsumptionEvent[];
  acquisitions: AcquisitionEvent[];
}): number[] {
  const sortedAcquisitions = sortAcquisitions({ acquisitions });

  return sortedAcquisitions.slice(0, -1).map((current, index) => {
    const next = sortedAcquisitions[index + 1];
    return consumptions.filter((event) =>
      isConsumptionBetweenAcquisitions({ consumption: event, current, next }),
    ).length;
  });
}
