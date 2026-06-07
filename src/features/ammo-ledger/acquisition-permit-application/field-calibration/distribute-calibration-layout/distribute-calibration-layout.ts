import type { OverlayFieldDef } from "../../form-template/form-template-types";

export function roundCalibrationMm({ value }: { value: number }): number {
  return Math.round(value * 100) / 100;
}

export function buildEvenlySpacedValues({
  start,
  end,
  count,
}: {
  start: number;
  end: number;
  count: number;
}): number[] {
  if (count <= 0) {
    return [];
  }
  if (count === 1) {
    return [roundCalibrationMm({ value: start })];
  }

  const step = (end - start) / (count - 1);
  return Array.from({ length: count }, (_, index) =>
    roundCalibrationMm({ value: start + step * index }),
  );
}

export function buildEvenYDistributionPatches({
  fields,
  selectedIds,
  count,
}: {
  fields: OverlayFieldDef[];
  selectedIds: string[];
  count: number;
}): Array<{ fieldId: string; patch: Partial<OverlayFieldDef> }> | null {
  if (count < 2) {
    return null;
  }

  const selected = fields
    .filter((field) => selectedIds.includes(field.id))
    .sort((left, right) => left.y - right.y || left.x - right.x);

  if (selected.length < 2 || selected.length !== count) {
    return null;
  }

  const ys = buildEvenlySpacedValues({
    start: selected[0].y,
    end: selected[selected.length - 1].y,
    count,
  });

  return selected.map((field, index) => ({
    fieldId: field.id,
    patch: { y: ys[index] },
  }));
}

export function computeRowHeightFromFieldAnchors({
  fields,
  selectedIds,
  rowCount,
}: {
  fields: OverlayFieldDef[];
  selectedIds: string[];
  rowCount: number;
}): { startY: number; rowHeight: number } | null {
  if (rowCount < 2 || selectedIds.length !== 2) {
    return null;
  }

  const selected = fields
    .filter((field) => selectedIds.includes(field.id))
    .sort((left, right) => left.y - right.y);

  if (selected.length !== 2) {
    return null;
  }

  const startY = selected[0].y;
  const endY = selected[1].y;
  const rowHeight = roundCalibrationMm({ value: (endY - startY) / (rowCount - 1) });

  if (rowHeight <= 0) {
    return null;
  }

  return { startY: roundCalibrationMm({ value: startY }), rowHeight };
}
