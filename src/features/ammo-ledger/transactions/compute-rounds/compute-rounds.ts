export function computeRounds({
  boxCount,
  looseRounds,
  roundsPerBox,
}: {
  boxCount: number;
  looseRounds: number;
  roundsPerBox: number;
}): number {
  return boxCount * roundsPerBox + looseRounds;
}
