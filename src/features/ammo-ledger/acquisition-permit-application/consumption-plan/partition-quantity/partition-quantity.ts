/** 合計を unit の倍数の塊に分割する（塊数は preferredBatchSize から決める） */
export function partitionQuantity({
  totalQuantity,
  unit,
  preferredBatchSize,
}: {
  totalQuantity: number;
  unit: number;
  preferredBatchSize: number;
}): number[] {
  if (totalQuantity <= 0) {
    return [];
  }

  if (totalQuantity % unit !== 0) {
    throw new Error(`totalQuantity must be a multiple of ${unit}`);
  }

  const pieceCount = Math.max(1, Math.ceil(totalQuantity / preferredBatchSize));
  return splitIntoUnitMultiples({
    totalQuantity,
    unit,
    pieceCount,
  });
}

export function splitIntoUnitMultiples({
  totalQuantity,
  unit,
  pieceCount,
}: {
  totalQuantity: number;
  unit: number;
  pieceCount: number;
}): number[] {
  if (pieceCount <= 0 || totalQuantity <= 0) {
    return [];
  }

  if (pieceCount === 1) {
    return [totalQuantity];
  }

  const base = Math.floor(totalQuantity / pieceCount / unit) * unit;
  const quantities = Array.from({ length: pieceCount }, () => base);
  let remainder = totalQuantity - base * pieceCount;

  let index = 0;
  while (remainder > 0) {
    quantities[index % pieceCount] += unit;
    remainder -= unit;
    index += 1;
  }

  return quantities.filter((quantity) => quantity > 0);
}

/** 各枠にできるだけ均等に配分する（25発単位・1枠上限を守る） */
export function distributeEvenlyAcrossSlots({
  slotCount,
  totalQuantity,
  maxPerSlot,
  unit,
}: {
  slotCount: number;
  totalQuantity: number;
  maxPerSlot: number;
  unit: number;
}): number[] {
  if (slotCount <= 0 || totalQuantity <= 0) {
    return [];
  }

  const capacity = slotCount * maxPerSlot;
  const target = Math.min(totalQuantity, capacity);
  const quantities = Array.from({ length: slotCount }, () => 0);
  let remaining = target;

  while (remaining >= unit) {
    const eligibleIndices = quantities
      .map((quantity, index) => ({ quantity, index }))
      .filter(({ quantity }) => quantity + unit <= maxPerSlot)
      .map(({ index }) => index);

    if (eligibleIndices.length === 0) {
      break;
    }

    const shareUnits = Math.floor(remaining / unit / eligibleIndices.length);
    if (shareUnits <= 0) {
      for (const index of eligibleIndices) {
        if (remaining < unit) {
          break;
        }
        quantities[index] += unit;
        remaining -= unit;
      }
      continue;
    }

    for (const index of eligibleIndices) {
      const addUnits = Math.min(
        shareUnits,
        Math.floor((maxPerSlot - quantities[index]) / unit),
        Math.floor(remaining / unit),
      );
      if (addUnits <= 0) {
        continue;
      }
      quantities[index] += addUnits * unit;
      remaining -= addUnits * unit;
    }
  }

  return quantities;
}
