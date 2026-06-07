import type { OverlayFieldDef } from "../form-template/form-template-types";
import { isRepeatingCalibrationFieldId } from "./repeating-rows-calibration/repeating-rows-calibration-ids";

export function resolveDeletableCalibrationFieldIds({
  selectedIds,
}: {
  selectedIds: string[];
}): string[] {
  return selectedIds.filter((id) => !isRepeatingCalibrationFieldId({ id }));
}

export function removeCalibrationFields({
  fields,
  fieldIds,
}: {
  fields: OverlayFieldDef[];
  fieldIds: string[];
}): OverlayFieldDef[] {
  if (fieldIds.length === 0) {
    return fields;
  }

  const idSet = new Set(fieldIds);
  return fields.filter((field) => !idSet.has(field.id));
}
