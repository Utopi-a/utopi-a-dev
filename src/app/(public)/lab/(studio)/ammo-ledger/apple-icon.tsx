import { createAmmoLedgerPwaIconResponse } from "@/features/ammo-ledger/pwa/create-ammo-ledger-pwa-icon-response";

export const size = {
  width: 180,
  height: 180,
};

export const contentType = "image/png";

export default function AppleIcon() {
  return createAmmoLedgerPwaIconResponse({ size: 180 });
}
