const STORAGE_PREFIX = "ammo-ledger:field-calibration-background-scale:";

export function loadCalibrationBackgroundScale({ templateId }: { templateId: string }): number {
  if (typeof window === "undefined") {
    return 1;
  }

  const raw = window.localStorage.getItem(`${STORAGE_PREFIX}${templateId}`);
  if (!raw) {
    return 1;
  }

  const parsed = Number(raw);
  return Number.isFinite(parsed) ? parsed : 1;
}

export function saveCalibrationBackgroundScale({
  templateId,
  scale,
}: {
  templateId: string;
  scale: number;
}): void {
  window.localStorage.setItem(`${STORAGE_PREFIX}${templateId}`, String(scale));
}
