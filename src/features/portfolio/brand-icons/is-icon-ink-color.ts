export function isIconInkColor({ r, g, b }: { r: number; g: number; b: number }): boolean {
  const spread = Math.max(r, g, b) - Math.min(r, g, b);
  const brightness = (r + g + b) / 3;

  return brightness < 130 && spread > 25;
}
