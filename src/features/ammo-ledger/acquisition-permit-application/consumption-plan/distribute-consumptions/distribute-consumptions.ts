import type { ConsumptionEvent, RangeAllocation } from "../consumption-plan-types";
import { distributeDatesEvenly } from "../distribute-acquisitions/distribute-acquisitions";

export function distributeConsumptions({
  requestedQuantity,
  periodFrom,
  periodTo,
  rangeAllocations,
  consumptionUnit = 25,
}: {
  requestedQuantity: number;
  periodFrom: string;
  periodTo: string;
  rangeAllocations: RangeAllocation[];
  consumptionUnit?: number;
}): ConsumptionEvent[] {
  if (requestedQuantity <= 0 || rangeAllocations.length === 0) {
    return [];
  }

  const chunkCount = requestedQuantity / consumptionUnit;
  if (!Number.isInteger(chunkCount)) {
    throw new Error("requestedQuantity must be a multiple of consumptionUnit");
  }

  const allocations = allocateChunksByWeight({
    chunkCount,
    rangeAllocations,
  });

  const events: ConsumptionEvent[] = [];

  for (const allocation of allocations) {
    if (allocation.chunks === 0) {
      continue;
    }

    const dates = distributeDatesEvenly({
      from: periodFrom,
      to: periodTo,
      count: allocation.chunks,
    });

    for (const date of dates) {
      events.push({
        date,
        quantity: consumptionUnit,
        rangeId: allocation.rangeId,
        rangeName: allocation.rangeName,
        rangeAddress: allocation.rangeAddress,
        purpose: allocation.purpose,
      });
    }
  }

  return events.sort((a, b) => compareDate({ a: a.date, b: b.date }));
}

function allocateChunksByWeight({
  chunkCount,
  rangeAllocations,
}: {
  chunkCount: number;
  rangeAllocations: RangeAllocation[];
}): Array<RangeAllocation & { chunks: number }> {
  const totalWeight = rangeAllocations.reduce((sum, item) => sum + item.weight, 0);
  if (totalWeight <= 0) {
    throw new Error("rangeAllocations must have positive total weight");
  }

  const raw = rangeAllocations.map((allocation) => {
    const exact = (chunkCount * allocation.weight) / totalWeight;
    return {
      ...allocation,
      chunks: Math.floor(exact),
      remainder: exact - Math.floor(exact),
    };
  });

  let assigned = raw.reduce((sum, item) => sum + item.chunks, 0);
  const sortedByRemainder = [...raw].sort((a, b) => b.remainder - a.remainder);

  for (const item of sortedByRemainder) {
    if (assigned >= chunkCount) {
      break;
    }
    item.chunks += 1;
    assigned += 1;
  }

  return raw.map(({ remainder: _remainder, ...allocation }) => allocation);
}

function compareDate({ a, b }: { a: string; b: string }): number {
  return a.localeCompare(b);
}
