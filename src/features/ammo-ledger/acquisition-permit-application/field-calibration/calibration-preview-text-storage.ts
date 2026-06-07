const STORAGE_PREFIX = "ammo-ledger:field-calibration-preview-text:";

export function loadCalibrationPreviewText({
  templateId,
}: {
  templateId: string;
}): Record<string, string> | null {
  if (typeof window === "undefined") {
    return null;
  }

  const raw = window.localStorage.getItem(`${STORAGE_PREFIX}${templateId}`);
  if (!raw) {
    return null;
  }

  try {
    return JSON.parse(raw) as Record<string, string>;
  } catch {
    return null;
  }
}

export function saveCalibrationPreviewText({
  templateId,
  values,
}: {
  templateId: string;
  values: Record<string, string>;
}): void {
  window.localStorage.setItem(`${STORAGE_PREFIX}${templateId}`, JSON.stringify(values));
}
