import type { LedgerCategory } from "@/features/ammo-ledger/schema/ledger-category";
import { mapCategoryToInputKind } from "@/features/ammo-ledger/schema/map-category-to-input-kind";

export function canEditLedgerEntry({
  entryUserId,
  requestUserId,
  voidedAt,
  category,
  transactionStatus,
}: {
  entryUserId: string;
  requestUserId: string;
  voidedAt: Date | null;
  category: LedgerCategory;
  transactionStatus: string | null;
}): boolean {
  if (entryUserId !== requestUserId) {
    return false;
  }
  if (voidedAt !== null) {
    return false;
  }
  if (mapCategoryToInputKind({ category }) === null) {
    return false;
  }
  if (transactionStatus !== "confirmed") {
    return false;
  }
  return true;
}
