import type { RangeAllocation } from "../consumption-plan-types";

export type NaturalRangeConsumption = {
  range: RangeAllocation;
  quantity: number;
};

type Candidate = {
  allocations: NaturalRangeConsumption[];
  score: [smallParts: number, rowCount: number];
};

/** 射撃場別の残量を守りつつ、不自然に小さい消費行と残量を避ける。 */
export function allocateNaturalRangeConsumptions({
  quantity,
  remainingByRange,
  rangeAllocations,
  consumptionUnit,
  minimumConsumption,
}: {
  quantity: number;
  remainingByRange: ReadonlyMap<string, number>;
  rangeAllocations: RangeAllocation[];
  consumptionUnit: number;
  minimumConsumption: number;
}): NaturalRangeConsumption[] {
  if (quantity <= 0) {
    return [];
  }

  const rangesWithRemaining = rangeAllocations
    .map((range, index) => ({
      range,
      remaining: remainingByRange.get(range.rangeId) ?? 0,
      index,
    }))
    .filter(({ remaining }) => remaining > 0)
    .sort((a, b) => b.remaining - a.remaining || a.index - b.index);

  const candidates: Candidate[] = [];
  const consider = (allocations: NaturalRangeConsumption[]) => {
    const smallParts = allocations.reduce((count, allocation) => {
      const remaining = remainingByRange.get(allocation.range.rangeId) ?? 0;
      const after = remaining - allocation.quantity;
      return (
        count +
        (allocation.quantity < minimumConsumption ? 1 : 0) +
        (after > 0 && after < minimumConsumption ? 1 : 0)
      );
    }, 0);
    candidates.push({ allocations, score: [smallParts, allocations.length] });
  };

  for (const current of rangesWithRemaining) {
    if (current.remaining >= quantity) {
      consider([{ range: current.range, quantity }]);
    }
  }

  for (let firstIndex = 0; firstIndex < rangesWithRemaining.length; firstIndex += 1) {
    const first = rangesWithRemaining[firstIndex];
    for (
      let secondIndex = firstIndex + 1;
      secondIndex < rangesWithRemaining.length;
      secondIndex += 1
    ) {
      const second = rangesWithRemaining[secondIndex];
      const minimumFirst = Math.max(consumptionUnit, quantity - second.remaining);
      const maximumFirst = Math.min(first.remaining, quantity - consumptionUnit);

      for (
        let firstQuantity = Math.ceil(minimumFirst / consumptionUnit) * consumptionUnit;
        firstQuantity <= maximumFirst;
        firstQuantity += consumptionUnit
      ) {
        const secondQuantity = quantity - firstQuantity;
        if (secondQuantity <= second.remaining && secondQuantity % consumptionUnit === 0) {
          consider([
            { range: first.range, quantity: firstQuantity },
            { range: second.range, quantity: secondQuantity },
          ]);
        }
      }
    }
  }

  const best = candidates.sort((a, b) => a.score[0] - b.score[0] || a.score[1] - b.score[1])[0];
  if (best) {
    return best.allocations;
  }

  const fallback: NaturalRangeConsumption[] = [];
  let unallocated = quantity;
  for (const current of rangesWithRemaining) {
    if (unallocated <= 0) {
      break;
    }
    const allocated = Math.min(unallocated, current.remaining);
    fallback.push({ range: current.range, quantity: allocated });
    unallocated -= allocated;
  }
  return fallback;
}
