import type { OverlayFieldDef } from "../form-template/form-template-types";

const STORAGE_PREFIX = "ammo-ledger:field-calibration:";

export function loadCalibrationFieldOverrides({
  templateId,
}: {
  templateId: string;
}): OverlayFieldDef[] | null {
  if (typeof window === "undefined") {
    return null;
  }

  const raw = window.localStorage.getItem(`${STORAGE_PREFIX}${templateId}`);
  if (!raw) {
    return null;
  }

  try {
    return JSON.parse(raw) as OverlayFieldDef[];
  } catch {
    return null;
  }
}

export function saveCalibrationFieldOverrides({
  templateId,
  fields,
}: {
  templateId: string;
  fields: OverlayFieldDef[];
}): void {
  window.localStorage.setItem(`${STORAGE_PREFIX}${templateId}`, JSON.stringify(fields));
}

export function clearCalibrationFieldOverrides({ templateId }: { templateId: string }): void {
  window.localStorage.removeItem(`${STORAGE_PREFIX}${templateId}`);
}
