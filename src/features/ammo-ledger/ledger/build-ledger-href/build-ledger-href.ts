import type { LedgerPurpose } from "@/features/ammo-ledger/schema/ledger-purpose";

export function buildLedgerHref({ purpose }: { purpose: LedgerPurpose }): string {
  const params = new URLSearchParams({ purpose });
  return `/lab/ammo-ledger/ledger?${params.toString()}`;
}
