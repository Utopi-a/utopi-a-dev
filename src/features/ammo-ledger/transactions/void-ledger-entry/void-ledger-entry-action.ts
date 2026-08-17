"use server";

import { and, eq, isNull } from "drizzle-orm";
import { db } from "@/db";
import { ammoLedgerEntry, ammoTransaction } from "@/db/schema/ammo-ledger";
import { resolveAmmoUserForMutation } from "@/features/ammo-ledger/auth/require-ammo-user";
import { acquireLedgerAdvisoryLock } from "@/features/ammo-ledger/ledger/lock/acquire-ledger-advisory-lock/acquire-ledger-advisory-lock";
import { assertDatesNotLocked } from "@/features/ammo-ledger/ledger/lock/assert-dates-not-locked/assert-dates-not-locked";
import { checkStockBeforeSave } from "@/features/ammo-ledger/transactions/check-stock-before-save/check-stock-before-save";
import { canVoidLedgerEntry } from "@/features/ammo-ledger/transactions/void-ledger-entry/can-void-ledger-entry";

export async function voidLedgerEntryAction({ ledgerEntryId }: { ledgerEntryId: string }) {
  const userResult = await resolveAmmoUserForMutation();
  if (!userResult.ok) {
    return userResult;
  }
  const user = userResult.user;

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

    if (!currentEntry) {
      return { ok: false as const, error: "記録が見つかりません" };
    }

    if (
      !canVoidLedgerEntry({
        entryUserId: currentEntry.userId,
        requestUserId: user.id,
        voidedAt: currentEntry.voidedAt,
      })
    ) {
      return { ok: false as const, error: "この記録は取消できません" };
    }

    const lockCheck = await assertDatesNotLocked({
      userId: user.id,
      dates: [currentEntry.occurredOn],
      executor: tx,
    });
    if (!lockCheck.ok) {
      return { ok: false as const, error: lockCheck.error };
    }

    const stockCheck = await checkStockBeforeSave({
      tx,
      userId: user.id,
      changes: [],
      excludedLedgerEntryIds: [ledgerEntryId],
    });
    if (!stockCheck.ok) {
      return stockCheck;
    }

    await tx
      .update(ammoLedgerEntry)
      .set({ voidedAt: now, updatedAt: now })
      .where(eq(ammoLedgerEntry.id, ledgerEntryId));

    if (currentEntry.transactionId) {
      await tx
        .update(ammoTransaction)
        .set({ status: "voided", updatedAt: now })
        .where(
          and(
            eq(ammoTransaction.id, currentEntry.transactionId),
            eq(ammoTransaction.userId, user.id),
          ),
        );
    }

    return { ok: true as const };
  });

  if (!transactionResult.ok) {
    return transactionResult;
  }

  return { ok: true as const };
}
