"use server";

import { and, eq, isNull } from "drizzle-orm";
import { db } from "@/db";
import { ammoLedgerEntry, ammoTransaction } from "@/db/schema/ammo-ledger";
import { requireAmmoUser } from "@/features/ammo-ledger/auth/require-ammo-user";
import { canVoidLedgerEntry } from "@/features/ammo-ledger/transactions/void-ledger-entry/can-void-ledger-entry";

export async function voidLedgerEntryAction({ ledgerEntryId }: { ledgerEntryId: string }) {
  const user = await requireAmmoUser();

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

  if (!entry) {
    return { ok: false as const, error: "記録が見つかりません" };
  }

  if (
    !canVoidLedgerEntry({
      entryUserId: entry.userId,
      requestUserId: user.id,
      voidedAt: entry.voidedAt,
    })
  ) {
    return { ok: false as const, error: "この記録は取消できません" };
  }

  const now = new Date();

  await db
    .update(ammoLedgerEntry)
    .set({ voidedAt: now, updatedAt: now })
    .where(eq(ammoLedgerEntry.id, ledgerEntryId));

  if (entry.transactionId) {
    await db
      .update(ammoTransaction)
      .set({ status: "voided", updatedAt: now })
      .where(and(eq(ammoTransaction.id, entry.transactionId), eq(ammoTransaction.userId, user.id)));
  }

  return { ok: true as const };
}
