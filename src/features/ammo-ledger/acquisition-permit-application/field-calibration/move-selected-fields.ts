import type { OverlayFieldDef } from "../form-template/form-template-types";

function roundMm({ value }: { value: number }): number {
  return Math.round(value * 100) / 100;
}

export function resolveGroupMoveIds({
  fieldId,
  selectedIds,
}: {
  fieldId: string;
  selectedIds: string[];
}): string[] {
  if (selectedIds.includes(fieldId) && selectedIds.length > 1) {
    return selectedIds;
  }
  return [fieldId];
}

export function buildGroupMoveOrigins({
  fields,
  moveIds,
}: {
  fields: OverlayFieldDef[];
  moveIds: string[];
}): Record<string, { x: number; y: number }> {
  const origins: Record<string, { x: number; y: number }> = {};
  for (const id of moveIds) {
    const field = fields.find((item) => item.id === id);
    if (field) {
      origins[id] = { x: field.x, y: field.y };
    }
  }
  return origins;
}

export function applyGroupMoveDelta({
  fields,
  origins,
  dx,
  dy,
}: {
  fields: OverlayFieldDef[];
  origins: Record<string, { x: number; y: number }>;
  dx: number;
  dy: number;
}): OverlayFieldDef[] {
  return fields.map((field) => {
    const origin = origins[field.id];
    if (!origin) {
      return field;
    }
    return {
      ...field,
      x: roundMm({ value: origin.x + dx }),
      y: roundMm({ value: origin.y + dy }),
    };
  });
}

export function applyGroupNudge({
  fields,
  moveIds,
  dx,
  dy,
}: {
  fields: OverlayFieldDef[];
  moveIds: string[];
  dx: number;
  dy: number;
}): OverlayFieldDef[] {
  const moveIdSet = new Set(moveIds);
  return fields.map((field) =>
    moveIdSet.has(field.id)
      ? {
          ...field,
          x: roundMm({ value: field.x + dx }),
          y: roundMm({ value: field.y + dy }),
        }
      : field,
  );
}

export function reorderSelectionPrimary({
  selectedIds,
  primaryId,
}: {
  selectedIds: string[];
  primaryId: string;
}): string[] {
  if (!selectedIds.includes(primaryId) || selectedIds.length <= 1) {
    return selectedIds;
  }
  return [...selectedIds.filter((id) => id !== primaryId), primaryId];
}
