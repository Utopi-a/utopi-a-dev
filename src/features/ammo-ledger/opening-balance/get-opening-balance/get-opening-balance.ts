import type { ammoLedgerEntry, ammoPermitEvent } from "@/db/schema/ammo-ledger";
import { buildYearOpeningDay } from "@/features/ammo-ledger/opening-balance/build-year-day/build-year-day";
import type { LedgerPurpose } from "@/features/ammo-ledger/schema/ledger-purpose";

export type OpeningBalanceSnapshot = {
  permitBalance: number | null;
  stockByAmmoType: Record<string, number>;
};

export function getOpeningBalance({
  year,
  purpose,
  entries,
  permitEvents,
}: {
  year: number;
  purpose: LedgerPurpose;
  entries: (typeof ammoLedgerEntry.$inferSelect)[];
  permitEvents: (typeof ammoPermitEvent.$inferSelect)[];
}): OpeningBalanceSnapshot {
  const openingDay = buildYearOpeningDay({ year });

  const permitEvent = permitEvents.find(
    (event) =>
      event.purpose === purpose &&
      event.eventKind === "carryover" &&
      event.occurredOn === openingDay,
  );

  const stockByAmmoType: Record<string, number> = {};

  for (const entry of entries) {
    if (
      entry.purpose === purpose &&
      entry.category === "carryover" &&
      entry.occurredOn === openingDay &&
      entry.ammoTypeId
    ) {
      stockByAmmoType[entry.ammoTypeId] = entry.quantity;
    }
  }

  return {
    permitBalance: permitEvent?.quantity ?? null,
    stockByAmmoType,
  };
}
