const defaultSmallBoxesPerOuterBox = 10;

export function computeRounds({
  outerBoxCount = 0,
  boxCount,
  looseRounds,
  roundsPerBox,
  smallBoxesPerOuterBox = defaultSmallBoxesPerOuterBox,
}: {
  outerBoxCount?: number;
  boxCount: number;
  looseRounds: number;
  roundsPerBox: number;
  smallBoxesPerOuterBox?: number;
}): number {
  const fromOuterBoxes = outerBoxCount * smallBoxesPerOuterBox * roundsPerBox;
  const fromBoxes = boxCount * roundsPerBox;
  return fromOuterBoxes + fromBoxes + looseRounds;
}

export const packagingDefaults = {
  smallBoxesPerOuterBox: defaultSmallBoxesPerOuterBox,
} as const;
