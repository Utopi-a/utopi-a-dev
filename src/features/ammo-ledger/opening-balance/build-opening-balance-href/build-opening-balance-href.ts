import { parseYearFromDate } from "@/features/ammo-ledger/opening-balance/build-year-day/build-year-day";
import type { LedgerPurpose } from "@/features/ammo-ledger/schema/ledger-purpose";

export function buildOpeningBalanceHref({
  occurredOn,
  purpose,
}: {
  occurredOn: string;
  purpose: LedgerPurpose;
}): string {
  const year = parseYearFromDate({ date: occurredOn });
  const params = new URLSearchParams({
    year: String(year),
    purpose,
  });
  return `/lab/ammo-ledger/settings/opening-balance?${params.toString()}`;
}
