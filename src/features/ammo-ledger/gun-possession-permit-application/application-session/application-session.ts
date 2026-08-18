import type { GunPermitApplicationPayload } from "../gun-possession-permit-application-types";

export const gunPermitApplicationSessionKey = "ammo-ledger:gun-possession-permit-application";

export function saveGunPermitApplicationPayload({
  payload,
}: {
  payload: GunPermitApplicationPayload;
}): void {
  sessionStorage.setItem(gunPermitApplicationSessionKey, JSON.stringify(payload));
}

export function loadGunPermitApplicationPayload(): GunPermitApplicationPayload | null {
  const raw = sessionStorage.getItem(gunPermitApplicationSessionKey);
  if (!raw) {
    return null;
  }

  try {
    return JSON.parse(raw) as GunPermitApplicationPayload;
  } catch {
    return null;
  }
}
