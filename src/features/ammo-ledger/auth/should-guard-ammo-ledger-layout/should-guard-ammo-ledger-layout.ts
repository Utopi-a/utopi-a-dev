import { ammoLedgerPwaConfig } from "@/features/ammo-ledger/pwa/ammo-ledger-pwa-config";

export function shouldGuardAmmoLedgerLayout({ pathname }: { pathname: string | null }) {
  return pathname !== ammoLedgerPwaConfig.offlinePath;
}
