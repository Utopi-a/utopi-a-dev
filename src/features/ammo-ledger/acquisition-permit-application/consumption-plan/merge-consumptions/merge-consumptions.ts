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

/** 各購入の直前に必要な保管上限対策消費量を算出する（配置は別処理） */
export function computeBufferNeedByAcquisition({
  initialStock,
  homeStorageLimit,
  acquisitions,
  shootingConsumptions,
  bufferConsumptions = [],
  consumptionUnit,
}: {
  initialStock: number;
  homeStorageLimit: number;
  acquisitions: AcquisitionEvent[];
  shootingConsumptions: ConsumptionEvent[];
  bufferConsumptions?: ConsumptionEvent[];
  consumptionUnit: number;
}): number[] {
  const sortedAcquisitions = [...acquisitions].sort((a, b) =>
    comparePlanPeriod({ a: a.scheduledPeriod, b: b.scheduledPeriod }),
  );
  const needs = Array.from({ length: sortedAcquisitions.length }, () => 0);

  type TimelineItem =
    | { kind: "acquisition"; period: PlanPeriod; quantity: number; acquisitionIndex: number }
    | { kind: "consumption"; period: PlanPeriod; quantity: number };

  const timeline: TimelineItem[] = [
    ...sortedAcquisitions.map((event, acquisitionIndex) => ({
      kind: "acquisition" as const,
      period: event.scheduledPeriod,
      quantity: event.quantity,
      acquisitionIndex,
    })),
    ...shootingConsumptions.map((event) => ({
      kind: "consumption" as const,
      period: event.scheduledPeriod,
      quantity: event.quantity,
    })),
    ...bufferConsumptions.map((event) => ({
      kind: "consumption" as const,
      period: event.scheduledPeriod,
      quantity: event.quantity,
    })),
  ].sort((a, b) => {
    const byPeriod = comparePlanPeriod({ a: a.period, b: b.period });
    if (byPeriod !== 0) {
      return byPeriod;
    }
    return a.kind === "acquisition" ? -1 : 1;
  });

  const bufferScheduled = bufferConsumptions.some((event) => event.quantity > 0);

  let stock = initialStock;

  for (const item of timeline) {
    if (item.kind === "acquisition") {
      const room = homeStorageLimit - stock;
      if (item.quantity > room) {
        const need = roundUpToUnit({
          value: item.quantity - room,
          unit: consumptionUnit,
        });
        needs[item.acquisitionIndex] = need;
        if (!bufferScheduled) {
          stock -= need;
        }
      }
      stock += item.quantity;
      continue;
    }

    stock -= item.quantity;
  }

  return needs;
}

/** 購入の直前に、自宅在庫が上限を超えないよう必要な消費を算出する */
export function computeStorageBufferConsumptions({
  initialStock,
  homeStorageLimit,
  acquisitions,
  shootingConsumptions,
  consumptionUnit,
}: {
  initialStock: number;
  homeStorageLimit: number;
  acquisitions: AcquisitionEvent[];
  shootingConsumptions: ConsumptionEvent[];
  consumptionUnit: number;
}): Map<string, number> {
  type TimelineItem =
    | { kind: "acquisition"; period: PlanPeriod; quantity: number }
    | { kind: "shooting"; period: PlanPeriod; quantity: number };

  const timeline: TimelineItem[] = [
    ...acquisitions.map((event) => ({
      kind: "acquisition" as const,
      period: event.scheduledPeriod,
      quantity: event.quantity,
    })),
    ...shootingConsumptions.map((event) => ({
      kind: "shooting" as const,
      period: event.scheduledPeriod,
      quantity: event.quantity,
    })),
  ].sort((a, b) => {
    const byPeriod = comparePlanPeriod({ a: a.period, b: b.period });
    if (byPeriod !== 0) {
      return byPeriod;
    }
    return a.kind === "acquisition" ? -1 : 1;
  });

  const quantitiesByPeriod = new Map<string, number>();
  let stock = initialStock;

  for (const item of timeline) {
    if (item.kind === "acquisition") {
      const room = homeStorageLimit - stock;
      if (item.quantity > room) {
        const need = roundUpToUnit({
          value: item.quantity - room,
          unit: consumptionUnit,
        });
        addPeriodQuantity({
          quantitiesByPeriod,
          period: item.period,
          quantity: need,
        });
        stock -= need;
      }
      stock += item.quantity;
      continue;
    }

    stock -= item.quantity;
  }

  return quantitiesByPeriod;
}

export function mergeConsumptions({
  baseConsumptions,
  bufferByPeriod,
  rangeAllocations,
}: {
  baseConsumptions: ConsumptionEvent[];
  bufferByPeriod: Map<string, number>;
  rangeAllocations: RangeAllocation[];
}): ConsumptionEvent[] {
  const merged = new Map<string, ConsumptionEvent>();
  const primaryRange = rangeAllocations[0];

  for (const event of baseConsumptions) {
    const key = serializePlanPeriodKey({ period: event.scheduledPeriod });
    merged.set(key, { ...event });
  }

  for (const [key, quantity] of bufferByPeriod) {
    if (quantity <= 0) {
      continue;
    }

    const existing = merged.get(key);
    if (existing) {
      existing.quantity += quantity;
      continue;
    }

    merged.set(key, {
      scheduledPeriod: parsePeriodKey({ key }),
      quantity,
      rangeId: primaryRange.rangeId,
      rangeName: primaryRange.rangeName,
      rangeAddress: primaryRange.rangeAddress,
      purpose: primaryRange.purpose,
    });
  }

  return [...merged.values()].sort((a, b) =>
    comparePlanPeriod({ a: a.scheduledPeriod, b: b.scheduledPeriod }),
  );
}

function bufferEventsFromPeriodMap({
  bufferByPeriod,
}: {
  bufferByPeriod: Map<string, number>;
}): ConsumptionEvent[] {
  return [...bufferByPeriod.entries()]
    .filter(([, quantity]) => quantity > 0)
    .map(([key, quantity]) => ({
      scheduledPeriod: parsePeriodKey({ key }),
      quantity,
      rangeId: "",
      rangeName: "",
      rangeAddress: "",
      purpose: "標的射撃" as const,
    }));
}

export function bufferConsumptionsFromMap({
  bufferByPeriod,
  rangeAllocations,
}: {
  bufferByPeriod: Map<string, number>;
  rangeAllocations: RangeAllocation[];
}): ConsumptionEvent[] {
  const primaryRange = rangeAllocations[0];

  return [...bufferByPeriod.entries()]
    .filter(([, quantity]) => quantity > 0)
    .map(([key, quantity]) => ({
      scheduledPeriod: parsePeriodKey({ key }),
      quantity,
      rangeId: primaryRange.rangeId,
      rangeName: primaryRange.rangeName,
      rangeAddress: primaryRange.rangeAddress,
      purpose: primaryRange.purpose,
    }));
}

function roundUpToUnit({ value, unit }: { value: number; unit: number }): number {
  if (value <= 0) {
    return 0;
  }
  return Math.ceil(value / unit) * unit;
}

function parsePeriodKey({ key }: { key: string }): PlanPeriod {
  const [year, month, period] = key.split("-");
  return {
    year: Number(year),
    month: Number(month),
    period: period as PlanPeriod["period"],
  };
}

function addPeriodQuantity({
  quantitiesByPeriod,
  period,
  quantity,
}: {
  quantitiesByPeriod: Map<string, number>;
  period: PlanPeriod;
  quantity: number;
}): void {
  const key = serializePlanPeriodKey({ period });
  quantitiesByPeriod.set(key, (quantitiesByPeriod.get(key) ?? 0) + quantity);
}
