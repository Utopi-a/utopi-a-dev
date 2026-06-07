export const REPEATING_CALIBRATION_FIELD_PREFIX = "repeating:";

export function isRepeatingCalibrationFieldId({ id }: { id: string }): boolean {
  return id.startsWith(REPEATING_CALIBRATION_FIELD_PREFIX);
}

export function repeatingCalibrationFieldId({ columnId }: { columnId: string }): string {
  return `${REPEATING_CALIBRATION_FIELD_PREFIX}${columnId}`;
}

export function parseRepeatingCalibrationColumnId({ fieldId }: { fieldId: string }): string | null {
  if (!isRepeatingCalibrationFieldId({ id: fieldId })) {
    return null;
  }
  return fieldId.slice(REPEATING_CALIBRATION_FIELD_PREFIX.length);
}
