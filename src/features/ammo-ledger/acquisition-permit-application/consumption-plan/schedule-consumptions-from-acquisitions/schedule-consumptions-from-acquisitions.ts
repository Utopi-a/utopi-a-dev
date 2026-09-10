import { allocateNaturalRangeConsumptions } from "../allocate-natural-range-consumptions/allocate-natural-range-consumptions";
import { compactSmallRangeConsumptions } from "../compact-small-range-consumptions/compact-small-range-consumptions";
import { splitGapConsumptionQuantity } from "../consumption-chunk-size/consumption-chunk-size";
import {
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

const maxConsumptionsPerGap = 2;
const maxConsumptionPerEvent = 500;
const preferredConsumptionUnit = 100;

/** 初回購入前と各購入後に、実在庫と次回購入の空きを守って消費を配分する。 */
export function scheduleConsumptionsFromAcquisitions({
  acquisitions,
  initialStock,
  homeStorageLimit,
  rangeAllocations,
  consumptionUnit = 25,
}: {
  acquisitions: AcquisitionEvent[];
  initialStock: number;
  homeStorageLimit: number;
  rangeAllocations: RangeAllocation[];
  consumptionUnit?: number;
}): ConsumptionEvent[] {
  const sortedAcquisitions = sortAcquisitions({ acquisitions });
  if (sortedAcquisitions.length === 0 || rangeAllocations.length === 0) {
    return [];
  }

  let remainingQuantity = sortedAcquisitions.reduce((sum, event) => sum + event.quantity, 0);
  const quantityByRange = allocateQuantityByWeight({
    totalQuantity: remainingQuantity,
    consumptionUnit,
    rangeAllocations,
  });
  const remainingByRange = new Map(
    quantityByRange.map((allocation) => [allocation.rangeId, allocation.quantity]),
  );
  const consumptions: ConsumptionEvent[] = [];
  let stock = initialStock;

  function addConsumptions({
    acquisition,
    quantity,
    beforePurchase = false,
  }: {
    acquisition: AcquisitionEvent;
    quantity: number;
    beforePurchase?: boolean;
  }) {
    const chunks = splitGapConsumptionQuantity({
      gapTotal: quantity,
      consumptionUnit,
      maxEventsPerGap: maxConsumptionsPerGap,
      preferredBatchSize: maxConsumptionPerEvent,
      maxPerEvent: maxConsumptionPerEvent,
    });
    let eventSequence = 0;
    for (const chunk of chunks) {
      const allocations = allocateNaturalRangeConsumptions({
        quantity: chunk,
        remainingByRange,
        rangeAllocations,
        consumptionUnit,
        minimumConsumption: naturalConsumptionUnit,
      });
      for (const { range, quantity: allocatedQuantity } of allocations) {
        const rangeRemaining = remainingByRange.get(range.rangeId) ?? 0;
        remainingByRange.set(range.rangeId, rangeRemaining - allocatedQuantity);
        consumptions.push({
          scheduledPeriod: acquisition.scheduledPeriod,
          // 初回と同じ旬でも、購入より前の消費であることを表示・シミュレーションに共有する。
          slotSequence: (acquisition.slotSequence ?? 0) - (beforePurchase ? 1 : 0),
          eventSequence,
          quantity: allocatedQuantity,
          rangeId: range.rangeId,
          rangeName: range.rangeName,
          rangeAddress: range.rangeAddress,
          purpose: range.purpose,
        });
        eventSequence += 1;
      }
    }
    stock -= quantity;
    remainingQuantity -= quantity;
  }

  const naturalConsumptionUnit = roundUpConsumption({
    quantity: preferredConsumptionUnit,
    consumptionUnit,
  });
  const firstAcquisition = sortedAcquisitions[0];
  const requiredBeforePurchase = roundUpConsumption({
    quantity: Math.max(0, stock + firstAcquisition.quantity - homeStorageLimit),
    consumptionUnit,
  });
  if (requiredBeforePurchase > 0) {
    addConsumptions({
      acquisition: firstAcquisition,
      quantity: chooseNaturalConsumptionQuantity({
        minimum: requiredBeforePurchase,
        maximum: Math.min(remainingQuantity, Math.floor(stock / consumptionUnit) * consumptionUnit),
        target: Math.ceil(requiredBeforePurchase / naturalConsumptionUnit) * naturalConsumptionUnit,
        remainingQuantity,
        naturalConsumptionUnit,
      }),
      beforePurchase: true,
    });
  }

  for (const [index, acquisition] of sortedAcquisitions.entries()) {
    stock += acquisition.quantity;
    const nextAcquisition = sortedAcquisitions[index + 1];
    const minimumConsumption = roundUpConsumption({
      quantity: Math.max(0, stock + (nextAcquisition?.quantity ?? 0) - homeStorageLimit),
      consumptionUnit,
    });
    const availableConsumption = Math.floor(stock / consumptionUnit) * consumptionUnit;
    const maximum = Math.min(remainingQuantity, availableConsumption);

    addConsumptions({
      acquisition,
      quantity: nextAcquisition
        ? chooseNaturalConsumptionQuantity({
            minimum: minimumConsumption,
            maximum,
            target: remainingQuantity / (sortedAcquisitions.length - index),
            remainingQuantity,
            naturalConsumptionUnit,
          })
        : maximum,
    });
  }

  return compactSmallRangeConsumptions({
    acquisitions: sortedAcquisitions,
    consumptions,
    initialStock,
    minimumConsumption: naturalConsumptionUnit,
    maxConsumptionPerEvent,
  });
}

function chooseNaturalConsumptionQuantity({
  minimum,
  maximum,
  target,
  remainingQuantity,
  naturalConsumptionUnit,
}: {
  minimum: number;
  maximum: number;
  target: number;
  remainingQuantity: number;
  naturalConsumptionUnit: number;
}): number {
  let quantity = Math.min(
    maximum,
    Math.max(
      naturalConsumptionUnit,
      Math.ceil(Math.max(target, minimum) / naturalConsumptionUnit) * naturalConsumptionUnit,
    ),
  );
  const remainder = remainingQuantity - quantity;
  if (remainder > 0 && remainder < naturalConsumptionUnit) {
    // 小さい最終行を作るより、今回と次回の両方をまとまった量にする。
    const leaveFullBatch = remainingQuantity - naturalConsumptionUnit;
    if (leaveFullBatch >= Math.max(minimum, naturalConsumptionUnit) && leaveFullBatch <= maximum) {
      quantity = leaveFullBatch;
    } else if (remainingQuantity <= maximum) {
      quantity = remainingQuantity;
    }
  }
  return quantity;
}

function roundUpConsumption({
  quantity,
  consumptionUnit,
}: {
  quantity: number;
  consumptionUnit: number;
}): number {
  return Math.ceil(quantity / consumptionUnit) * consumptionUnit;
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
    const exact = (allocation.weight / totalWeight) * unitCount;
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
