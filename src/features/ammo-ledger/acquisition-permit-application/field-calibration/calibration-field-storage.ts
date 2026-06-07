import type { OverlayFieldDef, RepeatingRowMap } from "../form-template/form-template-types";

const STORAGE_PREFIX = "ammo-ledger:field-calibration:";

export type CalibrationFieldOverrides = {
  fields: OverlayFieldDef[];
  repeatingRows?: RepeatingRowMap | null;
};

export function loadCalibrationFieldOverrides({
  templateId,
}: {
  templateId: string;
}): CalibrationFieldOverrides | null {
  if (typeof window === "undefined") {
    return null;
  }

  const raw = window.localStorage.getItem(`${STORAGE_PREFIX}${templateId}`);
  if (!raw) {
    return null;
  }

  try {
    const parsed = JSON.parse(raw) as OverlayFieldDef[] | CalibrationFieldOverrides;
    if (Array.isArray(parsed)) {
      return { fields: parsed };
    }
    return parsed;
  } catch {
    return null;
  }
}

export function saveCalibrationFieldOverrides({
  templateId,
  fields,
  repeatingRows,
}: {
  templateId: string;
  fields: OverlayFieldDef[];
  repeatingRows?: RepeatingRowMap | null;
}): void {
  window.localStorage.setItem(
    `${STORAGE_PREFIX}${templateId}`,
    JSON.stringify({ fields, repeatingRows: repeatingRows ?? null }),
  );
}

export function clearCalibrationFieldOverrides({ templateId }: { templateId: string }): void {
  window.localStorage.removeItem(`${STORAGE_PREFIX}${templateId}`);
}
