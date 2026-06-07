/** 1回あたりの消費量の目安（多すぎず少なすぎず） */
export function computePreferredConsumptionBatchSize({
  requestedQuantity,
  gapCount,
  maxEventsPerGap = 2,
  consumptionUnit,
  maxPerEvent,
}: {
  requestedQuantity: number;
  gapCount: number;
  maxEventsPerGap?: number;
  consumptionUnit: number;
  maxPerEvent: number;
}): number {
  const maxEvents = Math.max(1, gapCount * maxEventsPerGap);
  const idealUnits = Math.floor(requestedQuantity / maxEvents / consumptionUnit);
  const ideal = Math.max(consumptionUnit, idealUnits * consumptionUnit);

  const minimumReasonable = consumptionUnit * 4;
  const capped = Math.min(maxPerEvent, Math.max(minimumReasonable, ideal));

  return Math.max(consumptionUnit, capped);
}

/** 購入間の消費を1〜2块に分割する */
export function splitGapConsumptionQuantity({
  gapTotal,
  consumptionUnit,
  maxEventsPerGap = 2,
  preferredBatchSize,
  maxPerEvent,
}: {
  gapTotal: number;
  consumptionUnit: number;
  maxEventsPerGap?: number;
  preferredBatchSize: number;
  maxPerEvent: number;
}): number[] {
  if (gapTotal <= 0) {
    return [];
  }

  if (gapTotal <= maxPerEvent) {
    return [gapTotal];
  }

  if (gapTotal <= preferredBatchSize) {
    return [gapTotal];
  }

  const desiredEvents = Math.min(maxEventsPerGap, Math.ceil(gapTotal / preferredBatchSize));

  if (desiredEvents <= 1) {
    return [gapTotal];
  }

  return splitIntoTwoBalancedChunks({
    totalQuantity: gapTotal,
    unit: consumptionUnit,
    maxPerChunk: maxPerEvent,
  });
}

function splitIntoTwoBalancedChunks({
  totalQuantity,
  unit,
  maxPerChunk,
}: {
  totalQuantity: number;
  unit: number;
  maxPerChunk: number;
}): number[] {
  const half = Math.floor(totalQuantity / 2 / unit) * unit;
  let first = Math.min(half, maxPerChunk);
  let second = totalQuantity - first;

  if (second > maxPerChunk) {
    second = maxPerChunk;
    first = totalQuantity - second;
  }

  if (first <= 0) {
    return [totalQuantity];
  }

  if (second <= 0) {
    return [first];
  }

  return [first, second];
}
