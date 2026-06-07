import type { OverlayFieldDef, RepeatingRowMap } from "../form-template/form-template-types";
import { cloneCalibrationFields } from "./clone-calibration-fields";
import { cloneRepeatingRows } from "./repeating-rows-calibration/clone-repeating-rows";

export type CalibrationSnapshot = {
  fields: OverlayFieldDef[];
  repeatingRows: RepeatingRowMap | null;
};

export function cloneCalibrationSnapshot({
  snapshot,
}: {
  snapshot: CalibrationSnapshot;
}): CalibrationSnapshot {
  return {
    fields: cloneCalibrationFields({ fields: snapshot.fields }),
    repeatingRows: snapshot.repeatingRows
      ? cloneRepeatingRows({ repeatingRows: snapshot.repeatingRows })
      : null,
  };
}

function serializeOverlayField(field: OverlayFieldDef) {
  return {
    id: field.id,
    page: field.page,
    x: field.x,
    y: field.y,
    width: field.width,
    height: field.height,
    fontSize: field.fontSize,
    align: field.align,
    verticalAlign: field.verticalAlign,
    fitText: field.fitText,
    variant: field.variant,
  };
}

function serializeRepeatingRows(repeatingRows: RepeatingRowMap) {
  return {
    startY: repeatingRows.startY,
    rowHeight: repeatingRows.rowHeight,
    maxRowsPerPage: repeatingRows.maxRowsPerPage,
    columns: [...repeatingRows.columns]
      .map((column) => ({
        id: column.id,
        x: column.x,
        width: column.width,
        height: column.height,
        fontSize: column.fontSize,
        align: column.align,
        verticalAlign: column.verticalAlign,
        fitText: column.fitText,
        variant: column.variant,
        yOffset: column.yOffset,
      }))
      .sort((left, right) => left.id.localeCompare(right.id)),
  };
}

export function serializeCalibrationSnapshot({
  snapshot,
}: {
  snapshot: CalibrationSnapshot;
}): string {
  return JSON.stringify({
    fields: [...snapshot.fields]
      .map(serializeOverlayField)
      .sort((left, right) => left.id.localeCompare(right.id)),
    repeatingRows: snapshot.repeatingRows ? serializeRepeatingRows(snapshot.repeatingRows) : null,
  });
}

export function snapshotsEqual({
  left,
  right,
}: {
  left: CalibrationSnapshot;
  right: CalibrationSnapshot;
}): boolean {
  return (
    serializeCalibrationSnapshot({ snapshot: left }) ===
    serializeCalibrationSnapshot({ snapshot: right })
  );
}
