import type { LedgerPurpose } from "@/features/ammo-ledger/schema/ledger-purpose";

export function buildLedgerEntryRedirectPath({
  purpose,
  ledgerEntryId,
}: {
  purpose: LedgerPurpose;
  ledgerEntryId: string;
}): string {
  const params = new URLSearchParams({ purpose, entry: ledgerEntryId });
  return `/lab/ammo-ledger/ledger?${params.toString()}`;
}
