import {
  allocateQuotaAcrossGaps,
  buildBeforeFirstAcquisitionPeriods,
  buildStrictBetweenPurchaseGaps,
  pickPeriodsForGapChunks,
} from "../between-purchase-gap/between-purchase-gap";
import {
  computePreferredConsumptionBatchSize,
  splitGapConsumptionQuantity,
} from "../consumption-chunk-size/consumption-chunk-size";
import type {
  AcquisitionEvent,
  ConsumptionEvent,
  RangeAllocation,
} from "../consumption-plan-types";
import {
  comparePlanPeriod,
  computeMaxConsumptionPerPlanPeriod,
  listPlanPeriodsInRange,
  type PlanPeriod,
  serializePlanPeriodKey,
} from "../plan-period/plan-period";

export type ScheduledConsumptions = {
  shootingConsumptions: ConsumptionEvent[];
  bufferConsumptions: ConsumptionEvent[];
};

const maxConsumptionsPerGap = 2;

/** 購入と購入の間に消費を挟み、1回あたりの量を自然な大きさに保つ */
export function scheduleConsumptionsFromAcquisitions({
  acquisitions,
  requestedQuantity,
  shootingQuantity,
  bufferNeedByAcquisition,
  periodFrom,
  periodTo,
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

  const availablePeriods = listPlanPeriodsInRange({ from: periodFrom, to: periodTo });
  if (availablePeriods.length === 0) {
    return { shootingConsumptions: [], bufferConsumptions: [] };
  }

  const sortedAcquisitions = [...acquisitions].sort((a, b) =>
    comparePlanPeriod({ a: a.scheduledPeriod, b: b.scheduledPeriod }),
  );

  const nominalMaxPerEvent = computeMaxConsumptionPerPlanPeriod({
    requestedQuantity,
    periodFrom,
    periodTo,
    consumptionUnit,
  });

  const betweenGaps = buildStrictBetweenPurchaseGaps({
    acquisitions: sortedAcquisitions,
    availablePeriods,
  });

  const preferredBatchSize = computePreferredConsumptionBatchSize({
    requestedQuantity,
    gapCount: Math.max(1, betweenGaps.length),
    maxEventsPerGap: maxConsumptionsPerGap,
    consumptionUnit,
    maxPerEvent: nominalMaxPerEvent,
  });

  const perPurchaseAverage =
    Math.floor(requestedQuantity / Math.max(1, sortedAcquisitions.length) / consumptionUnit) *
    consumptionUnit;
  const maxPerEvent = Math.min(500, Math.max(preferredBatchSize, perPurchaseAverage));
  const primaryRange = rangeAllocations[0];
  const shootingByPeriod = new Map<string, number>();
  const bufferByPeriod = new Map<string, number>();

  const beforeFirstPeriods = buildBeforeFirstAcquisitionPeriods({
    acquisitions: sortedAcquisitions,
    availablePeriods,
  });
  const firstBufferNeed = bufferNeedByAcquisition[0] ?? 0;
  if (firstBufferNeed > 0) {
    assignQuantityToGap({
      periods:
        beforeFirstPeriods.length > 0
          ? beforeFirstPeriods
          : [sortedAcquisitions[0].scheduledPeriod],
      gapTotal: firstBufferNeed,
      consumptionUnit,
      maxPerEvent,
      preferredBatchSize,
      targetByPeriod: bufferByPeriod,
    });
  }

  const shootingQuotas =
    shootingQuantity > 0 && betweenGaps.length > 0
      ? allocateQuotaAcrossGaps({
          gaps: betweenGaps,
          totalQuantity: shootingQuantity,
          consumptionUnit,
        })
      : [];

  for (const [gapIndex, gap] of betweenGaps.entries()) {
    const bufferNeed = bufferNeedByAcquisition[gap.followingAcquisitionIndex] ?? 0;
    const shootingNeed = shootingQuotas[gapIndex] ?? 0;
    const gapTotal = bufferNeed + shootingNeed;

    if (gapTotal <= 0) {
      continue;
    }

    const chunks = splitGapConsumptionQuantity({
      gapTotal,
      consumptionUnit,
      maxEventsPerGap: maxConsumptionsPerGap,
      preferredBatchSize,
      maxPerEvent,
    });

    const chunkPeriods = pickPeriodsForGapChunks({
      periods: gap.periods,
      chunkCount: chunks.length,
    });

    const mergedChunks = mergeChunksOnSamePeriod({ periods: chunkPeriods, chunks });
    let bufferLeft = bufferNeed;
    let shootingLeft = shootingNeed;

    for (const { period, quantity } of mergedChunks) {
      const bufferPart = Math.min(bufferLeft, quantity);
      const shootingPart = quantity - bufferPart;

      if (bufferPart > 0) {
        addQuantityToPeriod({
          period,
          quantity: bufferPart,
          targetByPeriod: bufferByPeriod,
        });
        bufferLeft -= bufferPart;
      }

      if (shootingPart > 0) {
        addQuantityToPeriod({
          period,
          quantity: shootingPart,
          targetByPeriod: shootingByPeriod,
        });
        shootingLeft -= shootingPart;
      }
    }

    if (bufferLeft > 0) {
      assignRemainderToPeriod({
        periods: gap.periods,
        quantity: bufferLeft,
        targetByPeriod: bufferByPeriod,
      });
    }
    if (shootingLeft > 0) {
      assignRemainderToPeriod({
        periods: gap.periods,
        quantity: shootingLeft,
        targetByPeriod: shootingByPeriod,
      });
    }
  }

  const quantityByRange = allocateQuantityByWeight({
    totalQuantity: shootingQuantity,
    consumptionUnit,
    rangeAllocations,
  });
  const remainingByRange = new Map(
    quantityByRange.map((allocation) => [allocation.rangeId, allocation.quantity]),
  );

  const shootingConsumptions = buildConsumptionEvents({
    quantitiesByPeriod: shootingByPeriod,
    rangeAllocations,
    remainingByRange,
  });

  const bufferConsumptions = buildBufferConsumptionEvents({
    quantitiesByPeriod: bufferByPeriod,
    primaryRange,
  });

  return { shootingConsumptions, bufferConsumptions };
}

function assignQuantityToGap({
  periods,
  gapTotal,
  consumptionUnit,
  maxPerEvent,
  preferredBatchSize,
  targetByPeriod,
}: {
  periods: PlanPeriod[];
  gapTotal: number;
  consumptionUnit: number;
  maxPerEvent: number;
  preferredBatchSize: number;
  targetByPeriod: Map<string, number>;
}): void {
  const chunks = splitGapConsumptionQuantity({
    gapTotal,
    consumptionUnit,
    maxEventsPerGap: maxConsumptionsPerGap,
    preferredBatchSize,
    maxPerEvent,
  });

  const chunkPeriods = pickPeriodsForGapChunks({
    periods,
    chunkCount: chunks.length,
  });

  const merged = mergeChunksOnSamePeriod({ periods: chunkPeriods, chunks });

  for (const { period, quantity } of merged) {
    addQuantityToPeriod({
      period,
      quantity,
      targetByPeriod,
    });
  }
}

function assignRemainderToPeriod({
  periods,
  quantity,
  targetByPeriod,
}: {
  periods: PlanPeriod[];
  quantity: number;
  targetByPeriod: Map<string, number>;
}): void {
  const period = periods.at(-1);
  if (!period || quantity <= 0) {
    return;
  }

  addQuantityToPeriod({
    period,
    quantity,
    targetByPeriod,
  });
}

function addQuantityToPeriod({
  period,
  quantity,
  targetByPeriod,
}: {
  period: PlanPeriod;
  quantity: number;
  targetByPeriod: Map<string, number>;
}): void {
  const key = serializePlanPeriodKey({ period });
  targetByPeriod.set(key, (targetByPeriod.get(key) ?? 0) + quantity);
}

function mergeChunksOnSamePeriod({
  periods,
  chunks,
}: {
  periods: PlanPeriod[];
  chunks: number[];
}): Array<{ period: PlanPeriod; quantity: number }> {
  const merged = new Map<string, { period: PlanPeriod; quantity: number }>();

  for (const [index, quantity] of chunks.entries()) {
    const period = periods[Math.min(index, periods.length - 1)];
    const key = serializePlanPeriodKey({ period });
    const existing = merged.get(key);
    if (existing) {
      existing.quantity += quantity;
      continue;
    }
    merged.set(key, { period, quantity });
  }

  return [...merged.values()];
}

function buildConsumptionEvents({
  quantitiesByPeriod,
  rangeAllocations,
  remainingByRange,
}: {
  quantitiesByPeriod: Map<string, number>;
  rangeAllocations: RangeAllocation[];
  remainingByRange: Map<string, number>;
}): ConsumptionEvent[] {
  const events: ConsumptionEvent[] = [];

  for (const [key, quantity] of quantitiesByPeriod) {
    if (quantity <= 0) {
      continue;
    }

    const range = pickRangeWithRemaining({
      remainingByRange,
      rangeAllocations,
    });
    if (!range) {
      continue;
    }

    remainingByRange.set(range.rangeId, (remainingByRange.get(range.rangeId) ?? 0) - quantity);

    events.push({
      scheduledPeriod: parsePeriodKey({ key }),
      quantity,
      rangeId: range.rangeId,
      rangeName: range.rangeName,
      rangeAddress: range.rangeAddress,
      purpose: range.purpose,
    });
  }

  return events.sort((a, b) => comparePlanPeriod({ a: a.scheduledPeriod, b: b.scheduledPeriod }));
}

function buildBufferConsumptionEvents({
  quantitiesByPeriod,
  primaryRange,
}: {
  quantitiesByPeriod: Map<string, number>;
  primaryRange: RangeAllocation;
}): ConsumptionEvent[] {
  return [...quantitiesByPeriod.entries()]
    .filter(([, quantity]) => quantity > 0)
    .map(([key, quantity]) => ({
      scheduledPeriod: parsePeriodKey({ key }),
      quantity,
      rangeId: primaryRange.rangeId,
      rangeName: primaryRange.rangeName,
      rangeAddress: primaryRange.rangeAddress,
      purpose: primaryRange.purpose,
    }))
    .sort((a, b) => comparePlanPeriod({ a: a.scheduledPeriod, b: b.scheduledPeriod }));
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

function parsePeriodKey({ key }: { key: string }): PlanPeriod {
  const [year, month, period] = key.split("-");
  return {
    year: Number(year),
    month: Number(month),
    period: period as PlanPeriod["period"],
  };
}

export function collectPeriodsBetweenPurchases({
  acquisitions,
  availablePeriods,
}: {
  acquisitions: AcquisitionEvent[];
  availablePeriods: PlanPeriod[];
}): PlanPeriod[] {
  const gaps = buildStrictBetweenPurchaseGaps({ acquisitions, availablePeriods });
  return gaps.flatMap((gap) => gap.periods);
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
  return betweenPeriods.some(
    (candidate) =>
      serializePlanPeriodKey({ period: candidate }) === serializePlanPeriodKey({ period }),
  );
}

export function isPeriodBeforeAnyPurchase({
  period,
  acquisitions,
}: {
  period: PlanPeriod;
  acquisitions: AcquisitionEvent[];
}): boolean {
  return acquisitions.every(
    (acquisition) => comparePlanPeriod({ a: period, b: acquisition.scheduledPeriod }) < 0,
  );
}

export function countConsumptionsBetweenPurchases({
  consumptions,
  acquisitions,
}: {
  consumptions: ConsumptionEvent[];
  acquisitions: AcquisitionEvent[];
}): number[] {
  const sortedAcquisitions = [...acquisitions].sort((a, b) =>
    comparePlanPeriod({ a: a.scheduledPeriod, b: b.scheduledPeriod }),
  );

  return sortedAcquisitions.slice(0, -1).map((current, index) => {
    const next = sortedAcquisitions[index + 1];
    return consumptions.filter((event) => {
      const afterCurrent =
        comparePlanPeriod({ a: current.scheduledPeriod, b: event.scheduledPeriod }) <= 0;
      const beforeNext =
        comparePlanPeriod({ a: event.scheduledPeriod, b: next.scheduledPeriod }) <= 0;
      return afterCurrent && beforeNext;
    }).length;
  });
}
