/** 1pt = 25.4/72 mm（CSS pt と同じ換算） */
export const PT_TO_MM = 25.4 / 72;

export function mmFromPt({ pt }: { pt: number }): number {
  return Math.round(pt * PT_TO_MM * 100) / 100;
}

export function ptFromMm({ mm }: { mm: number }): number {
  return Math.round((mm / PT_TO_MM) * 2) / 2;
}

export function stepFontSizePt({
  fontSizeMm,
  deltaPt,
}: {
  fontSizeMm: number;
  deltaPt: number;
}): number {
  const nextPt = Math.max(0.5, ptFromMm({ mm: fontSizeMm }) + deltaPt);
  return mmFromPt({ pt: nextPt });
}
