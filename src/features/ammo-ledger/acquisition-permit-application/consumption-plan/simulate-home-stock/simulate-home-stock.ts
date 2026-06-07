import type { AcquisitionEvent, ConsumptionEvent } from "../consumption-plan-types";
import { comparePlanPeriod, type PlanPeriod } from "../plan-period/plan-period";

export type HomeStockSimulation = {
  peakHomeStock: number;
  timeline: HomeStockTimelineEntry[];
};

export type HomeStockTimelineEntry = {
  scheduledPeriod: PlanPeriod;
  stockAfter: number;
  kind: "bufferConsumption" | "acquisition" | "consumption";
  quantity: number;
};

export function simulateHomeStock({
  initialStock,
  acquisitions,
  shootingConsumptions,
  bufferConsumptions = [],
}: {
  initialStock: number;
  acquisitions: AcquisitionEvent[];
  shootingConsumptions: ConsumptionEvent[];
  bufferConsumptions?: ConsumptionEvent[];
}): HomeStockSimulation {
  const timeline = buildTimeline({
    initialStock,
    acquisitions,
    shootingConsumptions,
    bufferConsumptions,
  });

  const peakHomeStock = timeline.reduce(
    (peak, entry) => Math.max(peak, entry.stockAfter),
    initialStock,
  );

  return { peakHomeStock, timeline };
}

function buildTimeline({
  initialStock,
  acquisitions,
  shootingConsumptions,
  bufferConsumptions,
}: {
  initialStock: number;
  acquisitions: AcquisitionEvent[];
  shootingConsumptions: ConsumptionEvent[];
  bufferConsumptions: ConsumptionEvent[];
}): HomeStockTimelineEntry[] {
  type PendingEvent =
    | ({ kind: "bufferConsumption" } & ConsumptionEvent)
    | ({ kind: "acquisition" } & AcquisitionEvent)
    | ({ kind: "consumption" } & ConsumptionEvent);

  const pending: PendingEvent[] = [
    ...bufferConsumptions.map((event) => ({ kind: "bufferConsumption" as const, ...event })),
    ...acquisitions.map((event) => ({ kind: "acquisition" as const, ...event })),
    ...shootingConsumptions.map((event) => ({ kind: "consumption" as const, ...event })),
  ].sort((a, b) => {
    const byPeriod = comparePlanPeriod({ a: a.scheduledPeriod, b: b.scheduledPeriod });
    if (byPeriod !== 0) {
      return byPeriod;
    }

    const order = { bufferConsumption: 0, acquisition: 1, consumption: 2 };
    return order[a.kind] - order[b.kind];
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
      scheduledPeriod: event.scheduledPeriod,
      stockAfter: stock,
      kind: event.kind,
      quantity: event.quantity,
    });
  }

  return timeline;
}
