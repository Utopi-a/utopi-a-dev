"use server";

import { and, eq, isNull } from "drizzle-orm";
import { db } from "@/db";
import { ammoLedgerEntry, ammoTransaction } from "@/db/schema/ammo-ledger";
import { resolveAmmoUserForMutation } from "@/features/ammo-ledger/auth/require-ammo-user";
import type { LedgerCategory } from "@/features/ammo-ledger/schema/ledger-category";
import { mapCategoryToInputKind } from "@/features/ammo-ledger/schema/map-category-to-input-kind";
import { transactionInputSchema } from "@/features/ammo-ledger/schema/transaction-schema";
import { canEditLedgerEntry } from "@/features/ammo-ledger/transactions/can-edit-ledger-entry/can-edit-ledger-entry";
import { prepareConfirmedTransaction } from "@/features/ammo-ledger/transactions/prepare-confirmed-transaction/prepare-confirmed-transaction";

export async function updateTransactionAction({
  ledgerEntryId,
  ...input
}: {
  ledgerEntryId: string;
} & Record<string, unknown>) {
  const userResult = await resolveAmmoUserForMutation();
  if (!userResult.ok) {
    return userResult;
  }
  const user = userResult.user;
  const parsed = transactionInputSchema.safeParse(input);

  if (!parsed.success) {
    return { ok: false as const, error: "入力内容を確認してください" };
  }

  if (parsed.data.inputKind === "stock_check") {
    return { ok: false as const, error: "この記録は編集できません" };
  }

  const [entry] = await db
    .select()
    .from(ammoLedgerEntry)
    .where(
      and(
        eq(ammoLedgerEntry.id, ledgerEntryId),
        eq(ammoLedgerEntry.userId, user.id),
        isNull(ammoLedgerEntry.voidedAt),
      ),
    );

  if (!entry?.transactionId) {
    return { ok: false as const, error: "記録が見つかりません" };
  }

  const [transaction] = await db
    .select()
    .from(ammoTransaction)
    .where(and(eq(ammoTransaction.id, entry.transactionId), eq(ammoTransaction.userId, user.id)));

  if (!transaction) {
    return { ok: false as const, error: "記録が見つかりません" };
  }

  const category = entry.category as LedgerCategory;
  const expectedInputKind = mapCategoryToInputKind({ category });

  if (
    !expectedInputKind ||
    parsed.data.inputKind !== expectedInputKind ||
    !canEditLedgerEntry({
      entryUserId: entry.userId,
      requestUserId: user.id,
      voidedAt: entry.voidedAt,
      category,
      transactionStatus: transaction.status,
    })
  ) {
    return { ok: false as const, error: "この記録は編集できません" };
  }

  const preparedResult = await prepareConfirmedTransaction({
    userId: user.id,
    input: parsed.data,
  });

  if (!preparedResult.ok) {
    return { ok: false as const, error: preparedResult.error };
  }

  const {
    input: data,
    gunRow,
    rangeRow,
    counterparty,
    computedRounds,
    normalized,
  } = preparedResult.prepared;
  const now = new Date();

  await db.transaction(async (tx) => {
    await tx
      .update(ammoTransaction)
      .set({
        purpose: data.purpose,
        occurredOn: data.occurredOn,
        ammoTypeId: preparedResult.prepared.ammoTypeRow.id,
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
        updatedAt: now,
      })
      .where(and(eq(ammoTransaction.id, transaction.id), eq(ammoTransaction.userId, user.id)));

    await tx
      .update(ammoLedgerEntry)
      .set({
        purpose: data.purpose,
        occurredOn: normalized.occurredOn,
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
        updatedAt: now,
      })
      .where(and(eq(ammoLedgerEntry.id, ledgerEntryId), eq(ammoLedgerEntry.userId, user.id)));
  });

  return {
    ok: true as const,
    redirectPath: `/lab/ammo-ledger/ledger?purpose=${data.purpose}`,
  };
}
