import type { OverlayFieldDef } from "../form-template/form-template-types";

export function cloneCalibrationFields({
  fields,
}: {
  fields: OverlayFieldDef[];
}): OverlayFieldDef[] {
  return fields.map((field) => ({ ...field }));
}
