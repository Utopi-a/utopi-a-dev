"use server";

import { db } from "@/db";
import { ammoLedgerEntry, ammoTransaction } from "@/db/schema/ammo-ledger";
import { resolveAmmoUserForMutation } from "@/features/ammo-ledger/auth/require-ammo-user";
import { acquireLedgerAdvisoryLock } from "@/features/ammo-ledger/ledger/lock/acquire-ledger-advisory-lock/acquire-ledger-advisory-lock";
import { assertDatesNotLocked } from "@/features/ammo-ledger/ledger/lock/assert-dates-not-locked/assert-dates-not-locked";
import { resolveNextDayOrder } from "@/features/ammo-ledger/ledger/resolve-day-orders-for-new-entries/resolve-day-orders-for-new-entries";
import { transactionInputSchema } from "@/features/ammo-ledger/schema/transaction-schema";
import { buildLedgerEntryRedirectPath } from "@/features/ammo-ledger/transactions/build-ledger-entry-redirect-path/build-ledger-entry-redirect-path";
import { checkStockBeforeSave } from "@/features/ammo-ledger/transactions/check-stock-before-save/check-stock-before-save";
import { prepareConfirmedTransaction } from "@/features/ammo-ledger/transactions/prepare-confirmed-transaction/prepare-confirmed-transaction";

export async function createTransactionAction(input: unknown) {
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
    return { ok: false as const, error: "棚卸しは残弾確認画面から行ってください" };
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

  const transactionId = crypto.randomUUID();
  const ledgerEntryId = crypto.randomUUID();

  const transactionResult = await db.transaction(async (tx) => {
    await acquireLedgerAdvisoryLock({ tx, userId: user.id });

    const lockCheck = await assertDatesNotLocked({
      userId: user.id,
      dates: [normalized.occurredOn],
      executor: tx,
    });
    if (!lockCheck.ok) {
      return { ok: false as const, error: lockCheck.error };
    }

    const stockCheck = await checkStockBeforeSave({
      tx,
      userId: user.id,
      changes: [normalized],
    });
    if (!stockCheck.ok) {
      return stockCheck;
    }

    const dayOrder = await resolveNextDayOrder({
      tx,
      userId: user.id,
      occurredOn: normalized.occurredOn,
    });

    await tx.insert(ammoTransaction).values({
      id: transactionId,
      userId: user.id,
      status: "confirmed",
      inputKind: data.inputKind,
      purpose: data.purpose,
      occurredOn: data.occurredOn,
      ammoTypeId: ammoTypeRow.id,
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
      dayOrder,
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
    });

    return { ok: true as const };
  });

  if (!transactionResult.ok) {
    return transactionResult;
  }

  return {
    ok: true as const,
    ledgerEntryId,
    redirectPath: buildLedgerEntryRedirectPath({
      purpose: data.purpose,
      ledgerEntryId,
    }),
  };
}
