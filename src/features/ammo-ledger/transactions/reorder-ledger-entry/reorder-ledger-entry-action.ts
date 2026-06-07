"use server";

import { and, eq, isNull } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { ammoLedgerEntry } from "@/db/schema/ammo-ledger";
import { resolveAmmoUserForMutation } from "@/features/ammo-ledger/auth/require-ammo-user";
import { computeSwappedDayOrders } from "@/features/ammo-ledger/ledger/compute-swapped-day-orders/compute-swapped-day-orders";

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

  const [targetEntry] = await db
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

  const siblings = await db
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

  const now = new Date();

  await db.transaction(async (tx) => {
    for (const [entryId, dayOrder] of nextDayOrders) {
      await tx
        .update(ammoLedgerEntry)
        .set({ dayOrder, updatedAt: now })
        .where(and(eq(ammoLedgerEntry.id, entryId), eq(ammoLedgerEntry.userId, user.id)));
    }
  });

  return { ok: true as const };
}
