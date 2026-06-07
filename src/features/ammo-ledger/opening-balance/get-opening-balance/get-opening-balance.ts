import type {
  ammoAcquisitionPermit,
  ammoLedgerEntry,
  ammoPermitEvent,
} from "@/db/schema/ammo-ledger";
import { buildYearOpeningDay } from "@/features/ammo-ledger/opening-balance/build-year-day/build-year-day";
import type { LedgerPurpose } from "@/features/ammo-ledger/schema/ledger-purpose";

export type OpeningBalancePermitCarryover = {
  permitId: string;
  name: string;
  permitPurpose: string;
  quantity: number;
  expiresOn: string;
};

export type OpeningBalanceSnapshot = {
  permitCarryovers: OpeningBalancePermitCarryover[];
  stockByAmmoType: Record<string, number>;
};

function resolveCarryoverPermit({
  permitId,
  permits,
}: {
  permitId: string | null;
  permits: (typeof ammoAcquisitionPermit.$inferSelect)[];
}): typeof ammoAcquisitionPermit.$inferSelect | null {
  if (!permitId) {
    return null;
  }

  return permits.find((permit) => permit.id === permitId) ?? null;
}

export function getOpeningBalance({
  year,
  purpose,
  entries,
  permitEvents,
  permits,
}: {
  year: number;
  purpose: LedgerPurpose;
  entries: (typeof ammoLedgerEntry.$inferSelect)[];
  permitEvents: (typeof ammoPermitEvent.$inferSelect)[];
  permits: (typeof ammoAcquisitionPermit.$inferSelect)[];
}): OpeningBalanceSnapshot {
  const openingDay = buildYearOpeningDay({ year });

  const permitCarryovers = permitEvents
    .filter(
      (event) =>
        event.purpose === purpose &&
        event.eventKind === "carryover" &&
        event.occurredOn === openingDay &&
        event.permitId !== null,
    )
    .map((event) => {
      const permit = resolveCarryoverPermit({ permitId: event.permitId, permits });

      return {
        permitId: event.permitId as string,
        name: permit?.name ?? "その他",
        permitPurpose: permit?.permitPurpose ?? "",
        quantity: event.quantity,
        expiresOn: permit?.expiresOn ?? openingDay,
      };
    });
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
    permitCarryovers,
    stockByAmmoType,
  };
}
