"use server";

import { eq } from "drizzle-orm";
import { z } from "zod";
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

// 応答が届かずに再送された保存を二重に登録しないよう、画面で決めた記録 ID を受け付ける。
const clientLedgerEntryIdSchema = z.string().uuid().optional();

export async function createTransactionAction(input: unknown) {
  const userResult = await resolveAmmoUserForMutation();
  if (!userResult.ok) {
    return userResult;
  }
  const user = userResult.user;
  const parsed = transactionInputSchema.safeParse(input);
  const requestedLedgerEntryId = clientLedgerEntryIdSchema.safeParse(
    typeof input === "object" && input !== null && "ledgerEntryId" in input
      ? input.ledgerEntryId
      : undefined,
  );

  if (!parsed.success || !requestedLedgerEntryId.success) {
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
  const ledgerEntryId = requestedLedgerEntryId.data ?? crypto.randomUUID();
  const createdAt = new Date();

  const transactionResult = await db.transaction(async (tx) => {
    await acquireLedgerAdvisoryLock({ tx, userId: user.id });

    if (requestedLedgerEntryId.data) {
      const [savedEntry] = await tx
        .select()
        .from(ammoLedgerEntry)
        .where(eq(ammoLedgerEntry.id, ledgerEntryId));
      if (savedEntry) {
        if (savedEntry.userId !== user.id || savedEntry.voidedAt) {
          return { ok: false as const, error: "この記録は保存できません。入力し直してください" };
        }
        return { ok: true as const, entry: savedEntry, alreadySaved: true };
      }
    }

    const lockCheck = await assertDatesNotLocked({
      userId: user.id,
      dates: [normalized.occurredOn],
      executor: tx,
    });
    if (!lockCheck.ok) {
      return { ok: false as const, error: lockCheck.error };
    }

    const dayOrder = await resolveNextDayOrder({
      tx,
      userId: user.id,
      occurredOn: normalized.occurredOn,
    });

    const stockCheck = await checkStockBeforeSave({
      tx,
      userId: user.id,
      changes: [
        {
          ...normalized,
          id: ledgerEntryId,
          purpose: data.purpose,
          dayOrder,
          createdAt,
        },
      ],
    });
    if (!stockCheck.ok) {
      return stockCheck;
    }

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

    const [entry] = await tx
      .insert(ammoLedgerEntry)
      .values({
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
        createdAt,
      })
      .returning();

    return { ok: true as const, entry, alreadySaved: false };
  });

  if (!transactionResult.ok) {
    return transactionResult;
  }

  return {
    ok: true as const,
    ledgerEntryId,
    entry: transactionResult.entry,
    alreadySaved: transactionResult.alreadySaved,
    redirectPath: buildLedgerEntryRedirectPath({
      purpose: data.purpose,
      ledgerEntryId,
    }),
  };
}
