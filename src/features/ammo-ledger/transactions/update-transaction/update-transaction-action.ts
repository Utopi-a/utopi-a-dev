"use server";

import { and, eq, isNull } from "drizzle-orm";
import { db } from "@/db";
import { ammoLedgerEntry, ammoTransaction } from "@/db/schema/ammo-ledger";
import { resolveAmmoUserForMutation } from "@/features/ammo-ledger/auth/require-ammo-user";
import { acquireLedgerAdvisoryLock } from "@/features/ammo-ledger/ledger/lock/acquire-ledger-advisory-lock/acquire-ledger-advisory-lock";
import { assertDatesNotLocked } from "@/features/ammo-ledger/ledger/lock/assert-dates-not-locked/assert-dates-not-locked";
import type { LedgerCategory } from "@/features/ammo-ledger/schema/ledger-category";
import { mapCategoryToInputKind } from "@/features/ammo-ledger/schema/map-category-to-input-kind";
import { transactionInputSchema } from "@/features/ammo-ledger/schema/transaction-schema";
import { canEditLedgerEntry } from "@/features/ammo-ledger/transactions/can-edit-ledger-entry/can-edit-ledger-entry";
import { checkStockBeforeSave } from "@/features/ammo-ledger/transactions/check-stock-before-save/check-stock-before-save";
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

  const preparedResult = await prepareConfirmedTransaction({
    userId: user.id,
    input: parsed.data,
  });

  if (!preparedResult.ok) {
    return { ok: false as const, error: preparedResult.error };
  }

  const {
    input: data,
    ammoTypeRow,
    gunRow,
    rangeRow,
    counterparty,
    computedRounds,
    normalized,
  } = preparedResult.prepared;

  const now = new Date();

  const transactionResult = await db.transaction(async (tx) => {
    await acquireLedgerAdvisoryLock({ tx, userId: user.id });

    const [currentEntry] = await tx
      .select()
      .from(ammoLedgerEntry)
      .where(
        and(
          eq(ammoLedgerEntry.id, ledgerEntryId),
          eq(ammoLedgerEntry.userId, user.id),
          isNull(ammoLedgerEntry.voidedAt),
        ),
      );

    if (!currentEntry?.transactionId) {
      return { ok: false as const, error: "記録が見つかりません" };
    }

    const [currentTransaction] = await tx
      .select()
      .from(ammoTransaction)
      .where(
        and(
          eq(ammoTransaction.id, currentEntry.transactionId),
          eq(ammoTransaction.userId, user.id),
        ),
      );

    if (!currentTransaction) {
      return { ok: false as const, error: "記録が見つかりません" };
    }

    const category = currentEntry.category as LedgerCategory;
    const expectedInputKind = mapCategoryToInputKind({ category });

    if (
      !expectedInputKind ||
      parsed.data.inputKind !== expectedInputKind ||
      !canEditLedgerEntry({
        entryUserId: currentEntry.userId,
        requestUserId: user.id,
        voidedAt: currentEntry.voidedAt,
        category,
        transactionStatus: currentTransaction.status,
      })
    ) {
      return { ok: false as const, error: "この記録は編集できません" };
    }

    const lockCheck = await assertDatesNotLocked({
      userId: user.id,
      dates: [currentEntry.occurredOn, normalized.occurredOn],
      executor: tx,
    });
    if (!lockCheck.ok) {
      return { ok: false as const, error: lockCheck.error };
    }

    const stockCheck = await checkStockBeforeSave({
      tx,
      userId: user.id,
      changes: [normalized],
      excludedLedgerEntryId: ledgerEntryId,
    });
    if (!stockCheck.ok) {
      return stockCheck;
    }

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
      .where(
        and(eq(ammoTransaction.id, currentTransaction.id), eq(ammoTransaction.userId, user.id)),
      );

    await tx
      .update(ammoLedgerEntry)
      .set({
        purpose: data.purpose,
        occurredOn: normalized.occurredOn,
        ammoTypeId: normalized.ammoTypeId,
        ammoTypeName: normalized.ammoTypeName,
        ammoCartridgeType: ammoTypeRow.cartridgeType,
        ammoCaliber: ammoTypeRow.caliber,
        ammoGaugeNumber: ammoTypeRow.gaugeNumber,
        ledgerNote: data.ledgerNote ?? null,
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

    return { ok: true as const };
  });

  if (!transactionResult.ok) {
    return transactionResult;
  }

  return {
    ok: true as const,
    redirectPath: `/lab/ammo-ledger/ledger?purpose=${data.purpose}`,
  };
}
