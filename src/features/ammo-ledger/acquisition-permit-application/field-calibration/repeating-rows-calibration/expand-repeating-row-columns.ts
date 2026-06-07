import type { OverlayFieldDef, RepeatingRowMap } from "../../form-template/form-template-types";
import { repeatingCalibrationFieldId } from "./repeating-rows-calibration-ids";

export function expandRepeatingRowColumnsToFields({
  repeatingRows,
  pageIndex = 0,
}: {
  repeatingRows: RepeatingRowMap;
  pageIndex?: number;
}): OverlayFieldDef[] {
  return repeatingRows.columns.map((column) => ({
    id: repeatingCalibrationFieldId({ columnId: column.id }),
    page: pageIndex,
    x: column.x,
    y: repeatingRows.startY + (column.yOffset ?? 0),
    width: column.width,
    height: column.height,
    fontSize: column.fontSize,
    align: column.align,
    verticalAlign: column.verticalAlign,
    fitText: column.fitText,
    variant: column.variant,
  }));
}

export function buildCalibrationPageFields({
  fields,
  repeatingRows,
  pageIndex,
}: {
  fields: OverlayFieldDef[];
  repeatingRows: RepeatingRowMap | null;
  pageIndex: number;
}): OverlayFieldDef[] {
  const staticFields = fields.filter((field) => field.page === pageIndex);
  if (!repeatingRows || pageIndex !== 0) {
    return staticFields;
  }

  return [...staticFields, ...expandRepeatingRowColumnsToFields({ repeatingRows, pageIndex })];
}

export function findCalibrationFieldDef({
  fields,
  repeatingRows,
  pageCount,
  fieldId,
}: {
  fields: OverlayFieldDef[];
  repeatingRows: RepeatingRowMap | null;
  pageCount: number;
  fieldId: string;
}): OverlayFieldDef | undefined {
  for (let pageIndex = 0; pageIndex < pageCount; pageIndex += 1) {
    const field = buildCalibrationPageFields({ fields, repeatingRows, pageIndex }).find(
      (item) => item.id === fieldId,
    );
    if (field) {
      return field;
    }
  }
  return undefined;
}
