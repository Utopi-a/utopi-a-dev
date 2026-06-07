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
