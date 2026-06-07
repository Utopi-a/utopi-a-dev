export function isFieldCalibrationEnabled(): boolean {
  return process.env.NODE_ENV === "development";
}
