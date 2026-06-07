import type { ConsumptionEvent, RangeAllocation } from "../consumption-plan-types";
import { partitionQuantity } from "../partition-quantity/partition-quantity";
import { comparePlanPeriod, distributePlanPeriodsEvenly } from "../plan-period/plan-period";

export const preferredConsumptionBatch = 250;

export function distributeConsumptions({
  requestedQuantity,
  periodFrom,
  periodTo,
  rangeAllocations,
  consumptionUnit = 25,
  preferredBatchSize = preferredConsumptionBatch,
}: {
  requestedQuantity: number;
  periodFrom: string;
  periodTo: string;
  rangeAllocations: RangeAllocation[];
  consumptionUnit?: number;
  preferredBatchSize?: number;
}): ConsumptionEvent[] {
  if (requestedQuantity <= 0 || rangeAllocations.length === 0) {
    return [];
  }

  if (requestedQuantity % consumptionUnit !== 0) {
    throw new Error("requestedQuantity must be a multiple of consumptionUnit");
  }

  const quantityByRange = allocateQuantityByWeight({
    totalQuantity: requestedQuantity,
    consumptionUnit,
    rangeAllocations,
  });

  const events: ConsumptionEvent[] = [];

  for (const allocation of quantityByRange) {
    if (allocation.quantity <= 0) {
      continue;
    }

    const quantities = partitionQuantity({
      totalQuantity: allocation.quantity,
      unit: consumptionUnit,
      preferredBatchSize,
    });

    const scheduledPeriods = distributePlanPeriodsEvenly({
      from: periodFrom,
      to: periodTo,
      count: quantities.length,
    });

    for (const [index, quantity] of quantities.entries()) {
      events.push({
        scheduledPeriod: scheduledPeriods[index],
        quantity,
        rangeId: allocation.rangeId,
        rangeName: allocation.rangeName,
        rangeAddress: allocation.rangeAddress,
        purpose: allocation.purpose,
      });
    }
  }

  return events.sort((a, b) => comparePlanPeriod({ a: a.scheduledPeriod, b: b.scheduledPeriod }));
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
