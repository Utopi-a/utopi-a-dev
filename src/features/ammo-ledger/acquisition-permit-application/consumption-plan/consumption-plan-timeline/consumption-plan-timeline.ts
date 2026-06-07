import type { AcquisitionEvent, ConsumptionEvent } from "../consumption-plan-types";
import {
  comparePlanPeriod,
  type PlanPeriod,
  serializePlanPeriodKey,
} from "../plan-period/plan-period";

export type TimelineKind = "acquisition" | "consumption" | "bufferConsumption";

export type TimelinePosition = {
  scheduledPeriod: PlanPeriod;
  slotSequence?: number;
  eventSequence?: number;
  kind: TimelineKind;
};

export function compareTimelinePosition({
  a,
  b,
}: {
  a: TimelinePosition;
  b: TimelinePosition;
}): number {
  const byPeriod = comparePlanPeriod({ a: a.scheduledPeriod, b: b.scheduledPeriod });
  if (byPeriod !== 0) {
    return byPeriod;
  }

  const slotA = a.slotSequence ?? 0;
  const slotB = b.slotSequence ?? 0;
  if (slotA !== slotB) {
    return slotA - slotB;
  }

  const kindOrder: Record<TimelineKind, number> = {
    acquisition: 0,
    bufferConsumption: 1,
    consumption: 2,
  };
  const kindDiff = kindOrder[a.kind] - kindOrder[b.kind];
  if (kindDiff !== 0) {
    return kindDiff;
  }

  const eventA = a.eventSequence ?? 0;
  const eventB = b.eventSequence ?? 0;
  return eventA - eventB;
}

export function sortAcquisitions({
  acquisitions,
}: {
  acquisitions: AcquisitionEvent[];
}): AcquisitionEvent[] {
  return [...acquisitions].sort((a, b) =>
    compareTimelinePosition({
      a: { ...a, kind: "acquisition" },
      b: { ...b, kind: "acquisition" },
    }),
  );
}

export function serializeConsumptionSlotKey({
  period,
  slotSequence = 0,
}: {
  period: PlanPeriod;
  slotSequence?: number;
}): string {
  return `${serializePlanPeriodKey({ period })}:${slotSequence}`;
}

export function isConsumptionBetweenAcquisitions({
  consumption,
  current,
  next,
}: {
  consumption: ConsumptionEvent;
  current: AcquisitionEvent;
  next: AcquisitionEvent;
}): boolean {
  const consumptionPosition = compareTimelinePosition({
    a: { ...consumption, kind: "consumption" },
    b: { ...current, kind: "acquisition" },
  });
  const beforeNext = compareTimelinePosition({
    a: { ...consumption, kind: "consumption" },
    b: { ...next, kind: "acquisition" },
  });

  return consumptionPosition > 0 && beforeNext < 0;
}
