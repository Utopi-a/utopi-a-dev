import type { AcquisitionEvent, ConsumptionEvent } from "../consumption-plan-types";

export type HomeStockSimulation = {
  peakHomeStock: number;
  timeline: HomeStockTimelineEntry[];
};

export type HomeStockTimelineEntry = {
  date: string;
  stockAfter: number;
  kind: "acquisition" | "consumption";
  quantity: number;
};

export function simulateHomeStock({
  initialStock,
  acquisitions,
  consumptions,
}: {
  initialStock: number;
  acquisitions: AcquisitionEvent[];
  consumptions: ConsumptionEvent[];
}): HomeStockSimulation {
  const timeline = buildTimeline({
    initialStock,
    acquisitions,
    consumptions,
  });

  const peakHomeStock = timeline.reduce(
    (peak, entry) => Math.max(peak, entry.stockAfter),
    initialStock,
  );

  return { peakHomeStock, timeline };
}

export function rebalanceConsumptionsForHomeStorage({
  initialStock,
  homeStorageLimit,
  acquisitions,
  consumptions,
}: {
  initialStock: number;
  homeStorageLimit: number;
  acquisitions: AcquisitionEvent[];
  consumptions: ConsumptionEvent[];
}): ConsumptionEvent[] {
  const sortedAcquisitions = [...acquisitions].sort((a, b) => a.date.localeCompare(b.date));
  const mutableConsumptions = [...consumptions].sort((a, b) => a.date.localeCompare(b.date));

  for (const acquisition of sortedAcquisitions) {
    let simulation = simulateHomeStock({
      initialStock,
      acquisitions: sortedAcquisitions,
      consumptions: mutableConsumptions,
    });

    while (simulation.peakHomeStock > homeStorageLimit) {
      const moved = pullForwardConsumption({
        acquisitionDate: acquisition.date,
        consumptions: mutableConsumptions,
      });

      if (!moved) {
        break;
      }

      simulation = simulateHomeStock({
        initialStock,
        acquisitions: sortedAcquisitions,
        consumptions: mutableConsumptions,
      });
    }
  }

  return mutableConsumptions.sort((a, b) => a.date.localeCompare(b.date));
}

function pullForwardConsumption({
  acquisitionDate,
  consumptions,
}: {
  acquisitionDate: string;
  consumptions: ConsumptionEvent[];
}): boolean {
  const futureIndex = [...consumptions]
    .map((event, index) => ({ event, index }))
    .reverse()
    .find(({ event }) => event.date > acquisitionDate)?.index;

  if (futureIndex === undefined) {
    return false;
  }

  const [event] = consumptions.splice(futureIndex, 1);
  event.date = acquisitionDate;
  consumptions.push(event);
  consumptions.sort((a, b) => a.date.localeCompare(b.date));
  return true;
}

function buildTimeline({
  initialStock,
  acquisitions,
  consumptions,
}: {
  initialStock: number;
  acquisitions: AcquisitionEvent[];
  consumptions: ConsumptionEvent[];
}): HomeStockTimelineEntry[] {
  type PendingEvent =
    | ({ kind: "acquisition" } & AcquisitionEvent)
    | ({ kind: "consumption" } & ConsumptionEvent);

  const pending: PendingEvent[] = [
    ...acquisitions.map((event) => ({ kind: "acquisition" as const, ...event })),
    ...consumptions.map((event) => ({ kind: "consumption" as const, ...event })),
  ].sort((a, b) => {
    const byDate = a.date.localeCompare(b.date);
    if (byDate !== 0) {
      return byDate;
    }
    if (a.kind === b.kind) {
      return 0;
    }
    return a.kind === "consumption" ? -1 : 1;
  });

  let stock = initialStock;
  const timeline: HomeStockTimelineEntry[] = [];

  for (const event of pending) {
    if (event.kind === "acquisition") {
      stock += event.quantity;
    } else {
      stock -= event.quantity;
    }

    timeline.push({
      date: event.date,
      stockAfter: stock,
      kind: event.kind,
      quantity: event.quantity,
    });
  }

  return timeline;
}
