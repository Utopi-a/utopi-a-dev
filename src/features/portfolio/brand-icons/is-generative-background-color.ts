export function isGenerativeBackgroundColor({
  r,
  g,
  b,
}: {
  r: number;
  g: number;
  b: number;
}): boolean {
  const spread = Math.max(r, g, b) - Math.min(r, g, b);
  const brightness = (r + g + b) / 3;

  if (brightness < 50 && spread < 40) {
    return true;
  }

  if (brightness > 185 && spread < 50) {
    return true;
  }

  if (brightness > 70 && brightness < 190 && spread < 45) {
    return true;
  }

  return false;
}
