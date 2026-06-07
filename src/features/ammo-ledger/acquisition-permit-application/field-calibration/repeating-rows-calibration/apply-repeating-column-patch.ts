import type { OverlayFieldDef, RepeatingRowMap } from "../../form-template/form-template-types";
import {
  isRepeatingCalibrationFieldId,
  parseRepeatingCalibrationColumnId,
} from "./repeating-rows-calibration-ids";

function roundMm({ value }: { value: number }): number {
  return Math.round(value * 100) / 100;
}

export function applyRepeatingColumnOverlayPatch({
  repeatingRows,
  columnId,
  patch,
}: {
  repeatingRows: RepeatingRowMap;
  columnId: string;
  patch: Partial<OverlayFieldDef>;
}): RepeatingRowMap {
  return {
    ...repeatingRows,
    columns: repeatingRows.columns.map((column) => {
      if (column.id !== columnId) {
        return column;
      }

      const nextColumn = { ...column };
      if (patch.x !== undefined) {
        nextColumn.x = roundMm({ value: patch.x });
      }
      if (patch.y !== undefined) {
        nextColumn.yOffset = roundMm({ value: patch.y - repeatingRows.startY });
      }
      if (patch.width !== undefined) {
        nextColumn.width = roundMm({ value: patch.width });
      }
      if ("height" in patch) {
        if (patch.height === undefined) {
          delete nextColumn.height;
        } else {
          nextColumn.height = roundMm({ value: patch.height });
        }
      }
      if (patch.fontSize !== undefined) {
        nextColumn.fontSize = roundMm({ value: patch.fontSize });
      }
      if (patch.align !== undefined) {
        nextColumn.align = patch.align;
      }
      if ("verticalAlign" in patch) {
        if (patch.verticalAlign === undefined) {
          delete nextColumn.verticalAlign;
        } else {
          nextColumn.verticalAlign = patch.verticalAlign;
        }
      }
      if ("fitText" in patch) {
        if (patch.fitText === undefined) {
          delete nextColumn.fitText;
        } else {
          nextColumn.fitText = patch.fitText;
        }
      }
      if ("variant" in patch) {
        if (patch.variant === undefined) {
          delete nextColumn.variant;
        } else {
          nextColumn.variant = patch.variant;
        }
      }

      return nextColumn;
    }),
  };
}

export function applyCalibrationFieldPatch({
  fields,
  repeatingRows,
  fieldId,
  patch,
}: {
  fields: OverlayFieldDef[];
  repeatingRows: RepeatingRowMap | null;
  fieldId: string;
  patch: Partial<OverlayFieldDef>;
}): { fields: OverlayFieldDef[]; repeatingRows: RepeatingRowMap | null } {
  if (isRepeatingCalibrationFieldId({ id: fieldId })) {
    const columnId = parseRepeatingCalibrationColumnId({ fieldId });
    if (!columnId || !repeatingRows) {
      return { fields, repeatingRows };
    }

    return {
      fields,
      repeatingRows: applyRepeatingColumnOverlayPatch({
        repeatingRows,
        columnId,
        patch,
      }),
    };
  }

  return {
    fields: fields.map((field) => (field.id === fieldId ? { ...field, ...patch } : field)),
    repeatingRows,
  };
}

export function applyCalibrationFieldPatches({
  fields,
  repeatingRows,
  patches,
}: {
  fields: OverlayFieldDef[];
  repeatingRows: RepeatingRowMap | null;
  patches: Array<{ fieldId: string; patch: Partial<OverlayFieldDef> }>;
}): { fields: OverlayFieldDef[]; repeatingRows: RepeatingRowMap | null } {
  return patches.reduce(
    (state, item) =>
      applyCalibrationFieldPatch({
        fields: state.fields,
        repeatingRows: state.repeatingRows,
        fieldId: item.fieldId,
        patch: item.patch,
      }),
    { fields, repeatingRows },
  );
}

export function applyGroupMoveDeltaToCalibration({
  fields,
  repeatingRows,
  origins,
  dx,
  dy,
}: {
  fields: OverlayFieldDef[];
  repeatingRows: RepeatingRowMap | null;
  origins: Record<string, { x: number; y: number }>;
  dx: number;
  dy: number;
}): { fields: OverlayFieldDef[]; repeatingRows: RepeatingRowMap | null } {
  const patches = Object.entries(origins).map(([fieldId, origin]) => ({
    fieldId,
    patch: {
      x: roundMm({ value: origin.x + dx }),
      y: roundMm({ value: origin.y + dy }),
    },
  }));

  return applyCalibrationFieldPatches({ fields, repeatingRows, patches });
}
