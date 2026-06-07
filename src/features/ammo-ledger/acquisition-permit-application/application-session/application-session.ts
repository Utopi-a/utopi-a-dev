import type { AcquisitionPermitApplicationPayload } from "../acquisition-permit-application-types";

export const acquisitionPermitApplicationSessionKey = "ammo-ledger:acquisition-permit-application";

export function saveAcquisitionPermitApplicationPayload({
  payload,
}: {
  payload: AcquisitionPermitApplicationPayload;
}): void {
  sessionStorage.setItem(acquisitionPermitApplicationSessionKey, JSON.stringify(payload));
}

export function loadAcquisitionPermitApplicationPayload(): AcquisitionPermitApplicationPayload | null {
  const raw = sessionStorage.getItem(acquisitionPermitApplicationSessionKey);
  if (!raw) {
    return null;
  }

  try {
    return JSON.parse(raw) as AcquisitionPermitApplicationPayload;
  } catch {
    return null;
  }
}
