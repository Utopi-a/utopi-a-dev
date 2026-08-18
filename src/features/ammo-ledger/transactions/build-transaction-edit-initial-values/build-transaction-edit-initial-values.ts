import type { ammoLedgerEntry, ammoTransaction } from "@/db/schema/ammo-ledger";
import type { LedgerPurpose } from "@/features/ammo-ledger/schema/ledger-purpose";
import { manualCounterpartyId } from "@/features/ammo-ledger/schema/manual-counterparty-id";

export type TransactionEditInitialValues = {
  ledgerEntryId: string;
  originalQuantity: number;
  purpose: LedgerPurpose;
  occurredOn: string;
  ammoTypeId: string;
  outerBoxCount: number;
  boxCount: number;
  looseRounds: number;
  memo?: string;
  ledgerNote?: string;
  gunId?: string;
  rangeId?: string;
  location?: string;
  counterpartyId?: string;
  counterpartyName?: string;
  counterpartyAddress?: string;
};

export function buildTransactionEditInitialValues({
  entry,
  transaction,
  registeredCounterpartyIds,
}: {
  entry: typeof ammoLedgerEntry.$inferSelect;
  transaction: typeof ammoTransaction.$inferSelect;
  registeredCounterpartyIds: Set<string>;
}): TransactionEditInitialValues {
  const counterpartyUsesMaster =
    transaction.counterpartyId !== null &&
    registeredCounterpartyIds.has(transaction.counterpartyId);

  const usesManualCounterparty =
    !counterpartyUsesMaster &&
    Boolean(transaction.counterpartyName || transaction.counterpartyAddress);

  const ammoTypeId = entry.ammoTypeId ?? transaction.ammoTypeId ?? "";
  const hasAmmoTypeMismatch =
    entry.ammoTypeId !== null && entry.ammoTypeId !== transaction.ammoTypeId;

  return {
    ledgerEntryId: entry.id,
    originalQuantity: entry.quantity,
    purpose: entry.purpose as LedgerPurpose,
    occurredOn: entry.occurredOn,
    ammoTypeId,
    outerBoxCount: hasAmmoTypeMismatch ? 0 : transaction.outerBoxCount,
    boxCount: hasAmmoTypeMismatch ? 0 : transaction.boxCount,
    looseRounds: hasAmmoTypeMismatch ? entry.quantity : transaction.looseRounds,
    memo: transaction.memo ?? undefined,
    ledgerNote: entry.ledgerNote ?? undefined,
    gunId: entry.gunId ?? transaction.gunId ?? undefined,
    rangeId: transaction.rangeId ?? undefined,
    location: !transaction.rangeId ? (entry.location ?? undefined) : undefined,
    counterpartyId: counterpartyUsesMaster
      ? (transaction.counterpartyId ?? undefined)
      : usesManualCounterparty
        ? manualCounterpartyId
        : undefined,
    counterpartyName: counterpartyUsesMaster
      ? undefined
      : (transaction.counterpartyName ?? entry.counterpartyName ?? undefined),
    counterpartyAddress: counterpartyUsesMaster
      ? undefined
      : (transaction.counterpartyAddress ?? entry.counterpartyAddress ?? undefined),
  };
}
