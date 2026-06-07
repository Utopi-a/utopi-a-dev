import type { ammoLedgerEntry, ammoTransaction } from "@/db/schema/ammo-ledger";
import type { LedgerPurpose } from "@/features/ammo-ledger/schema/ledger-purpose";
import { manualCounterpartyId } from "@/features/ammo-ledger/schema/manual-counterparty-id";

export type TransactionEditInitialValues = {
  ledgerEntryId: string;
  purpose: LedgerPurpose;
  occurredOn: string;
  ammoTypeId: string;
  outerBoxCount: number;
  boxCount: number;
  looseRounds: number;
  memo?: string;
  gunId?: string;
  rangeId?: string;
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

  return {
    ledgerEntryId: entry.id,
    purpose: entry.purpose as LedgerPurpose,
    occurredOn: entry.occurredOn,
    ammoTypeId: transaction.ammoTypeId ?? entry.ammoTypeId ?? "",
    outerBoxCount: transaction.outerBoxCount,
    boxCount: transaction.boxCount,
    looseRounds: transaction.looseRounds,
    memo: transaction.memo ?? undefined,
    gunId: transaction.gunId ?? entry.gunId ?? undefined,
    rangeId: transaction.rangeId ?? undefined,
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
