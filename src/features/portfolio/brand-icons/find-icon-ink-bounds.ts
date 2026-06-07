import { isIconInkColor } from "@/features/portfolio/brand-icons/is-icon-ink-color";

export type ContentBounds = {
  left: number;
  top: number;
  width: number;
  height: number;
};

export function findIconInkBounds({
  data,
  width,
  height,
  minInkPixelsPerRow,
}: {
  data: Uint8Array;
  width: number;
  height: number;
  minInkPixelsPerRow: number;
}): ContentBounds | null {
  const activeRows: Array<{ top: number; left: number; right: number }> = [];

  for (let y = 0; y < height; y += 1) {
    let inkPixels = 0;
    let left = width;
    let right = 0;

    for (let x = 0; x < width; x += 1) {
      const index = (y * width + x) * 4;
      const r = data[index];
      const g = data[index + 1];
      const b = data[index + 2];

      if (!isIconInkColor({ r, g, b })) {
        continue;
      }

      inkPixels += 1;
      left = Math.min(left, x);
      right = Math.max(right, x);
    }

    if (inkPixels < minInkPixelsPerRow) {
      continue;
    }

    activeRows.push({ top: y, left, right });
  }

  if (activeRows.length === 0) {
    return null;
  }

  const top = activeRows[0].top;
  const bottom = activeRows[activeRows.length - 1].top;
  let left = width;
  let right = 0;

  for (const row of activeRows) {
    left = Math.min(left, row.left);
    right = Math.max(right, row.right);
  }

  return {
    left,
    top,
    width: right - left + 1,
    height: bottom - top + 1,
  };
}
