import { compareTimelinePosition } from "../consumption-plan-timeline/consumption-plan-timeline";
import type { AcquisitionEvent, ConsumptionEvent } from "../consumption-plan-types";

export type HomeStockSimulation = {
  peakHomeStock: number;
  timeline: HomeStockTimelineEntry[];
};

export type HomeStockTimelineEntry = {
  scheduledPeriod: ConsumptionEvent["scheduledPeriod"];
  slotSequence?: number;
  eventSequence?: number;
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
    ...shootingConsumptions.map((event) => ({ kind: "consumption" as const, ...event })),
    ...acquisitions.map((event) => ({ kind: "acquisition" as const, ...event })),
  ].sort((a, b) =>
    compareTimelinePosition({
      a: {
        scheduledPeriod: a.scheduledPeriod,
        slotSequence: a.slotSequence,
        eventSequence: "eventSequence" in a ? a.eventSequence : undefined,
        kind: a.kind,
      },
      b: {
        scheduledPeriod: b.scheduledPeriod,
        slotSequence: b.slotSequence,
        eventSequence: "eventSequence" in b ? b.eventSequence : undefined,
        kind: b.kind,
      },
    }),
  );

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
      slotSequence: event.slotSequence,
      eventSequence: "eventSequence" in event ? event.eventSequence : undefined,
      stockAfter: stock,
      kind: event.kind,
      quantity: event.quantity,
    });
  }

  return timeline;
}
