import type { ammoLedgerEntry, ammoType } from "@/db/schema/ammo-ledger";

export function resolveEntryPermitName({
  entry,
  ammoTypeById,
}: {
  entry: typeof ammoLedgerEntry.$inferSelect;
  ammoTypeById: Map<string, typeof ammoType.$inferSelect>;
}): string | null {
  if (!entry.ammoTypeId) {
    return null;
  }

  const ammoTypeRow = ammoTypeById.get(entry.ammoTypeId);
  return ammoTypeRow?.caliber ?? null;
}
