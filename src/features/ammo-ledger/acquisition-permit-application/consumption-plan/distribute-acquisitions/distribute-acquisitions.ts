import type { AcquisitionEvent } from "../consumption-plan-types";

export function distributeAcquisitions({
  requestedQuantity,
  periodFrom,
  periodTo,
  purchaseUnit = 250,
}: {
  requestedQuantity: number;
  periodFrom: string;
  periodTo: string;
  purchaseUnit?: number;
}): AcquisitionEvent[] {
  if (requestedQuantity <= 0) {
    return [];
  }

  const eventCount = Math.ceil(requestedQuantity / purchaseUnit);
  const dates = distributeDatesEvenly({
    from: periodFrom,
    to: periodTo,
    count: eventCount,
  });

  const events: AcquisitionEvent[] = [];
  let remaining = requestedQuantity;

  for (const date of dates) {
    const quantity = Math.min(purchaseUnit, remaining);
    events.push({ date, quantity });
    remaining -= quantity;
  }

  return events;
}

export function distributeDatesEvenly({
  from,
  to,
  count,
}: {
  from: string;
  to: string;
  count: number;
}): string[] {
  if (count <= 0) {
    return [];
  }

  if (count === 1) {
    return [from];
  }

  const start = parseDate({ value: from });
  const end = parseDate({ value: to });
  const spanMs = end.getTime() - start.getTime();

  return Array.from({ length: count }, (_, index) => {
    const offsetMs = (spanMs * index) / (count - 1);
    return formatDate({ value: new Date(start.getTime() + offsetMs) });
  });
}

function parseDate({ value }: { value: string }): Date {
  const [year, month, day] = value.split("-").map(Number);
  return new Date(year, month - 1, day);
}

function formatDate({ value }: { value: Date }): string {
  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, "0");
  const day = String(value.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}
