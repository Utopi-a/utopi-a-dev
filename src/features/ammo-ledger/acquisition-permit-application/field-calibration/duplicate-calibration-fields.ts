import { resolveOverlayFieldBox } from "../fit-text-to-box/resolve-overlay-field-box";
import type { OverlayFieldDef } from "../form-template/form-template-types";

function roundMm({ value }: { value: number }): number {
  return Math.round(value * 100) / 100;
}

function buildUniqueFieldId({
  baseId,
  suffix,
  existingIds,
}: {
  baseId: string;
  suffix: string;
  existingIds: Set<string>;
}): string {
  let candidate = `${baseId}${suffix}`;
  let index = 2;
  while (existingIds.has(candidate)) {
    candidate = `${baseId}${suffix}${index}`;
    index += 1;
  }
  existingIds.add(candidate);
  return candidate;
}

function duplicateSelection({
  fields,
  selectedIds,
  existingIds,
  offsetX,
  offsetY,
  idSuffix,
}: {
  fields: OverlayFieldDef[];
  selectedIds: string[];
  existingIds: Set<string>;
  offsetX: number;
  offsetY: number;
  idSuffix: string;
}): { duplicates: OverlayFieldDef[]; newIds: string[] } {
  const selected = fields.filter((field) => selectedIds.includes(field.id));
  const newIds: string[] = [];
  const duplicates = selected.map((field) => {
    const id = buildUniqueFieldId({
      baseId: field.id.replace(/(_copy\d*|_r\d+)+$/u, ""),
      suffix: idSuffix,
      existingIds,
    });
    newIds.push(id);
    return {
      ...field,
      id,
      x: roundMm({ value: field.x + offsetX }),
      y: roundMm({ value: field.y + offsetY }),
    };
  });

  return { duplicates, newIds };
}

export function duplicateSelectedFields({
  fields,
  selectedIds,
  offsetX = 2,
  offsetY = 2,
}: {
  fields: OverlayFieldDef[];
  selectedIds: string[];
  offsetX?: number;
  offsetY?: number;
}): { fields: OverlayFieldDef[]; newIds: string[] } {
  const existingIds = new Set(fields.map((field) => field.id));
  const { duplicates, newIds } = duplicateSelection({
    fields,
    selectedIds,
    existingIds,
    offsetX,
    offsetY,
    idSuffix: "_copy",
  });

  return {
    fields: [...fields, ...duplicates],
    newIds,
  };
}

export function repeatSelectedFieldLayout({
  fields,
  selectedIds,
  repeatCount,
  offsetY,
}: {
  fields: OverlayFieldDef[];
  selectedIds: string[];
  repeatCount: number;
  offsetY: number;
}): { fields: OverlayFieldDef[]; newIds: string[] } {
  if (selectedIds.length === 0 || repeatCount < 1) {
    return { fields, newIds: [] };
  }

  let nextFields = fields;
  const allNewIds: string[] = [];
  const existingIds = new Set(fields.map((field) => field.id));

  for (let repeatIndex = 1; repeatIndex <= repeatCount; repeatIndex += 1) {
    const { duplicates, newIds } = duplicateSelection({
      fields,
      selectedIds,
      existingIds,
      offsetX: 0,
      offsetY: roundMm({ value: offsetY * repeatIndex }),
      idSuffix: `_r${repeatIndex}`,
    });
    nextFields = [...nextFields, ...duplicates];
    allNewIds.push(...newIds);
  }

  return {
    fields: nextFields,
    newIds: allNewIds,
  };
}

export function fieldIntersectsMarquee({
  field,
  marquee,
}: {
  field: OverlayFieldDef;
  marquee: { left: number; top: number; right: number; bottom: number };
}): boolean {
  const { width, height } = resolveOverlayFieldBox({ field });
  const fieldRight = field.x + width;
  const fieldBottom = field.y + height;

  return !(
    fieldRight < marquee.left ||
    field.x > marquee.right ||
    fieldBottom < marquee.top ||
    field.y > marquee.bottom
  );
}

export function selectFieldIdsInMarquee({
  fields,
  marquee,
}: {
  fields: OverlayFieldDef[];
  marquee: { left: number; top: number; right: number; bottom: number };
}): string[] {
  return fields
    .filter((field) => fieldIntersectsMarquee({ field, marquee }))
    .map((field) => field.id);
}
