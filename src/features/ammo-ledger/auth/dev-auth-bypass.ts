import { isDevelopmentEnvironment } from "@/lib/is-development-environment";

export function isDevAmmoAuthBypassEnabled(): boolean {
  return isDevelopmentEnvironment() && Boolean(process.env.AMMO_LEDGER_DEV_USER_EMAIL?.trim());
}

export function shouldBypassAmmoLedgerAuth({ pathname }: { pathname: string }): boolean {
  return (
    isDevAmmoAuthBypassEnabled() &&
    (pathname === "/lab/ammo-ledger" || pathname.startsWith("/lab/ammo-ledger/"))
  );
}
