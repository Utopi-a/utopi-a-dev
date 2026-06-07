"use server";

import { db } from "@/db";
import { ammoLedgerEntry, ammoTransaction } from "@/db/schema/ammo-ledger";
import { resolveAmmoUserForMutation } from "@/features/ammo-ledger/auth/require-ammo-user";
import {
  assignDayOrdersForNewEntries,
  fetchMaxDayOrderByDate,
} from "@/features/ammo-ledger/ledger/resolve-day-orders-for-new-entries/resolve-day-orders-for-new-entries";
import { bulkTransactionsInputSchema } from "@/features/ammo-ledger/schema/bulk-transaction-schema";
import {
  type PreparedConfirmedTransaction,
  prepareConfirmedTransaction,
} from "@/features/ammo-ledger/transactions/prepare-confirmed-transaction/prepare-confirmed-transaction";

export async function createBulkTransactionsAction(input: unknown) {
  const userResult = await resolveAmmoUserForMutation();
  if (!userResult.ok) {
    return userResult;
  }
  const user = userResult.user;

  const parsed = bulkTransactionsInputSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false as const, error: "入力内容を確認してください" };
  }

  const preparedTransactions: PreparedConfirmedTransaction[] = [];

  for (const [index, transactionInput] of parsed.data.entries.entries()) {
    const preparedResult = await prepareConfirmedTransaction({
      userId: user.id,
      input: transactionInput,
    });

    if (!preparedResult.ok) {
      return {
        ok: false as const,
        error: `${index + 1}件目: ${preparedResult.error}`,
      };
    }

    preparedTransactions.push(preparedResult.prepared);
  }

  await db.transaction(async (tx) => {
    const occurredOnDates = preparedTransactions.map((prepared) => prepared.normalized.occurredOn);
    const maxDayOrderByDate = await fetchMaxDayOrderByDate({
      tx,
      userId: user.id,
      occurredOnDates,
    });
    const dayOrders = assignDayOrdersForNewEntries({
      occurredOnDates,
      maxDayOrderByDate,
    });

    for (const [index, prepared] of preparedTransactions.entries()) {
      const { input: data, gunRow, rangeRow, counterparty, computedRounds, normalized } = prepared;

      const transactionId = crypto.randomUUID();
      const ledgerEntryId = crypto.randomUUID();

      await tx.insert(ammoTransaction).values({
        id: transactionId,
        userId: user.id,
        status: "confirmed",
        inputKind: data.inputKind,
        purpose: data.purpose,
        occurredOn: data.occurredOn,
        ammoTypeId: prepared.ammoTypeRow.id,
        gunId: gunRow?.id ?? null,
        rangeId: rangeRow?.id ?? null,
        counterpartyId: counterparty?.counterpartyId ?? null,
        outerBoxCount: data.outerBoxCount,
        boxCount: data.boxCount,
        looseRounds: data.looseRounds,
        computedRounds,
        counterpartyName: counterparty?.name ?? null,
        counterpartyAddress: counterparty?.address ?? null,
        memo: data.memo ?? null,
      });

      await tx.insert(ammoLedgerEntry).values({
        id: ledgerEntryId,
        userId: user.id,
        transactionId,
        category: normalized.category,
        purpose: data.purpose,
        occurredOn: normalized.occurredOn,
        dayOrder: dayOrders[index],
        ammoTypeId: normalized.ammoTypeId,
        ammoTypeName: normalized.ammoTypeName,
        quantity: normalized.quantity,
        location: normalized.location,
        counterpartyName: normalized.counterpartyName,
        counterpartyAddress: normalized.counterpartyAddress,
        gunId: normalized.gunId,
        gunName: normalized.gunName,
        gunNumber: normalized.gunNumber,
        gunPermitNumber: normalized.gunPermitNumber,
      });
    }
  });

  const redirectPurpose = parsed.data.entries[0]?.purpose ?? "shooting";

  return {
    ok: true as const,
    createdCount: preparedTransactions.length,
    redirectPath: `/lab/ammo-ledger/ledger?purpose=${redirectPurpose}`,
  };
}
