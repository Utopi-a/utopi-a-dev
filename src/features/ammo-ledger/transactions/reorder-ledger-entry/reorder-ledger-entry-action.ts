"use server";

import { and, eq, isNull } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { ammoLedgerEntry } from "@/db/schema/ammo-ledger";
import { resolveAmmoUserForMutation } from "@/features/ammo-ledger/auth/require-ammo-user";
import { computeSwappedDayOrders } from "@/features/ammo-ledger/ledger/compute-swapped-day-orders/compute-swapped-day-orders";
import { acquireLedgerAdvisoryLock } from "@/features/ammo-ledger/ledger/lock/acquire-ledger-advisory-lock/acquire-ledger-advisory-lock";
import { assertDatesNotLocked } from "@/features/ammo-ledger/ledger/lock/assert-dates-not-locked/assert-dates-not-locked";

const reorderLedgerEntryInputSchema = z.object({
  ledgerEntryId: z.string().min(1),
  direction: z.enum(["up", "down"]),
});

export async function reorderLedgerEntryAction(input: unknown) {
  const userResult = await resolveAmmoUserForMutation();
  if (!userResult.ok) {
    return userResult;
  }
  const user = userResult.user;

  const parsed = reorderLedgerEntryInputSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false as const, error: "並び替え内容を確認してください" };
  }

  const { ledgerEntryId, direction } = parsed.data;

  const now = new Date();

  const transactionResult = await db.transaction(async (tx) => {
    await acquireLedgerAdvisoryLock({ tx, userId: user.id });

    const [targetEntry] = await tx
      .select()
      .from(ammoLedgerEntry)
      .where(
        and(
          eq(ammoLedgerEntry.id, ledgerEntryId),
          eq(ammoLedgerEntry.userId, user.id),
          isNull(ammoLedgerEntry.voidedAt),
        ),
      );

    if (!targetEntry) {
      return { ok: false as const, error: "記録が見つかりません" };
    }

    const lockCheck = await assertDatesNotLocked({
      userId: user.id,
      dates: [targetEntry.occurredOn],
      executor: tx,
    });
    if (!lockCheck.ok) {
      return { ok: false as const, error: lockCheck.error };
    }

    const siblings = await tx
      .select()
      .from(ammoLedgerEntry)
      .where(
        and(
          eq(ammoLedgerEntry.userId, user.id),
          eq(ammoLedgerEntry.occurredOn, targetEntry.occurredOn),
          eq(ammoLedgerEntry.purpose, targetEntry.purpose),
          isNull(ammoLedgerEntry.voidedAt),
        ),
      );

    const nextDayOrders = computeSwappedDayOrders({
      entries: siblings,
      ledgerEntryId,
      direction,
    });

    if (!nextDayOrders) {
      return { ok: false as const, error: "この方向には移動できません" };
    }

    for (const [entryId, dayOrder] of nextDayOrders) {
      await tx
        .update(ammoLedgerEntry)
        .set({ dayOrder, updatedAt: now })
        .where(and(eq(ammoLedgerEntry.id, entryId), eq(ammoLedgerEntry.userId, user.id)));
    }

    return { ok: true as const };
  });

  if (!transactionResult.ok) {
    return transactionResult;
  }

  return { ok: true as const };
}
