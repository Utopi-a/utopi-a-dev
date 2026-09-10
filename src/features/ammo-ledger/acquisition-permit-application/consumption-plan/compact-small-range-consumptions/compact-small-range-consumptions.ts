import {
  compareTimelinePosition,
  isConsumptionBetweenAcquisitions,
  sortAcquisitions,
} from "../consumption-plan-timeline/consumption-plan-timeline";
import type { AcquisitionEvent, ConsumptionEvent } from "../consumption-plan-types";
import { simulateHomeStock } from "../simulate-home-stock/simulate-home-stock";

/** 小さい消費行を、在庫と購入間の消費を守りながら同じ射撃場の過去行へまとめる。 */
export function compactSmallRangeConsumptions({
  acquisitions,
  consumptions,
  initialStock,
  minimumConsumption,
  maxConsumptionPerEvent,
}: {
  acquisitions: AcquisitionEvent[];
  consumptions: ConsumptionEvent[];
  initialStock: number;
  minimumConsumption: number;
  maxConsumptionPerEvent: number;
}): ConsumptionEvent[] {
  const sortedAcquisitions = sortAcquisitions({ acquisitions });
  const compacted = consumptions
    .map((consumption) => ({ ...consumption }))
    .sort(compareConsumptions);

  for (let sourceIndex = 0; sourceIndex < compacted.length; sourceIndex += 1) {
    const source = compacted[sourceIndex];
    if (isOnlyConsumptionBetweenPurchases(source)) {
      continue;
    }

    for (let destinationIndex = sourceIndex - 1; destinationIndex >= 0; destinationIndex -= 1) {
      const destination = compacted[destinationIndex];
      if (
        destination.rangeId !== source.rangeId ||
        (source.quantity >= minimumConsumption && destination.quantity >= minimumConsumption) ||
        destination.quantity + source.quantity > maxConsumptionPerEvent
      ) {
        continue;
      }

      const candidate = compacted.map((consumption) => ({ ...consumption }));
      candidate[destinationIndex].quantity += source.quantity;
      candidate.splice(sourceIndex, 1);
      const keepsNonNegativeStock = simulateHomeStock({
        initialStock,
        acquisitions: sortedAcquisitions,
        shootingConsumptions: candidate,
      }).timeline.every(({ stockAfter }) => stockAfter >= 0);
      if (!keepsNonNegativeStock) {
        continue;
      }

      compacted[destinationIndex].quantity += source.quantity;
      compacted.splice(sourceIndex, 1);
      sourceIndex -= 1;
      break;
    }
  }

  return compacted;

  function isOnlyConsumptionBetweenPurchases(consumption: ConsumptionEvent): boolean {
    for (let index = 0; index < sortedAcquisitions.length - 1; index += 1) {
      const current = sortedAcquisitions[index];
      const next = sortedAcquisitions[index + 1];
      if (!isConsumptionBetweenAcquisitions({ consumption, current, next })) {
        continue;
      }
      return (
        compacted.filter((candidate) =>
          isConsumptionBetweenAcquisitions({ consumption: candidate, current, next }),
        ).length === 1
      );
    }
    return false;
  }
}

function compareConsumptions(a: ConsumptionEvent, b: ConsumptionEvent): number {
  return compareTimelinePosition({
    a: { ...a, kind: "consumption" },
    b: { ...b, kind: "consumption" },
  });
}
