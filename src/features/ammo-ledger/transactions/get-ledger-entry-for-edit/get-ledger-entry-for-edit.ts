import { and, eq, isNull } from "drizzle-orm";
import { db } from "@/db";
import { ammoCounterparty, ammoLedgerEntry, ammoTransaction } from "@/db/schema/ammo-ledger";
import type { InputKind } from "@/features/ammo-ledger/schema/input-kind";
import type { LedgerCategory } from "@/features/ammo-ledger/schema/ledger-category";
import { mapCategoryToInputKind } from "@/features/ammo-ledger/schema/map-category-to-input-kind";
import {
  buildTransactionEditInitialValues,
  type TransactionEditInitialValues,
} from "@/features/ammo-ledger/transactions/build-transaction-edit-initial-values/build-transaction-edit-initial-values";
import { canEditLedgerEntry } from "@/features/ammo-ledger/transactions/can-edit-ledger-entry/can-edit-ledger-entry";

export type LedgerEntryForEdit = {
  inputKind: InputKind;
  category: LedgerCategory;
  initialValues: TransactionEditInitialValues;
};

export async function getLedgerEntryForEdit({
  userId,
  ledgerEntryId,
}: {
  userId: string;
  ledgerEntryId: string;
}): Promise<LedgerEntryForEdit | null> {
  const [entry] = await db
    .select()
    .from(ammoLedgerEntry)
    .where(
      and(
        eq(ammoLedgerEntry.id, ledgerEntryId),
        eq(ammoLedgerEntry.userId, userId),
        isNull(ammoLedgerEntry.voidedAt),
      ),
    );

  if (!entry?.transactionId) {
    return null;
  }

  const [transaction] = await db
    .select()
    .from(ammoTransaction)
    .where(and(eq(ammoTransaction.id, entry.transactionId), eq(ammoTransaction.userId, userId)));

  if (!transaction) {
    return null;
  }

  const category = entry.category as LedgerCategory;
  const inputKind = mapCategoryToInputKind({ category });

  if (
    !inputKind ||
    !canEditLedgerEntry({
      entryUserId: entry.userId,
      requestUserId: userId,
      voidedAt: entry.voidedAt,
      category,
      transactionStatus: transaction.status,
    })
  ) {
    return null;
  }

  const counterparties = await db
    .select({ id: ammoCounterparty.id })
    .from(ammoCounterparty)
    .where(eq(ammoCounterparty.userId, userId));

  return {
    inputKind,
    category,
    initialValues: buildTransactionEditInitialValues({
      entry,
      transaction,
      registeredCounterpartyIds: new Set(counterparties.map((row) => row.id)),
    }),
  };
}
