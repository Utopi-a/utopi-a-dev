"use server";

import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { ammoLedgerEntry, ammoTransaction, ammoType } from "@/db/schema/ammo-ledger";
import { resolveAmmoUserForMutation } from "@/features/ammo-ledger/auth/require-ammo-user";
import { acquireLedgerAdvisoryLock } from "@/features/ammo-ledger/ledger/lock/acquire-ledger-advisory-lock/acquire-ledger-advisory-lock";

export async function deleteAmmoTypeAction({ id }: { id: string }) {
  const userResult = await resolveAmmoUserForMutation();
  if (!userResult.ok) {
    return userResult;
  }
  const user = userResult.user;

  return db.transaction(async (tx) => {
    await acquireLedgerAdvisoryLock({ tx, userId: user.id });

    const [[ledgerReference], [transactionReference]] = await Promise.all([
      tx
        .select({ id: ammoLedgerEntry.id })
        .from(ammoLedgerEntry)
        .where(and(eq(ammoLedgerEntry.userId, user.id), eq(ammoLedgerEntry.ammoTypeId, id)))
        .limit(1),
      tx
        .select({ id: ammoTransaction.id })
        .from(ammoTransaction)
        .where(and(eq(ammoTransaction.userId, user.id), eq(ammoTransaction.ammoTypeId, id)))
        .limit(1),
    ]);

    if (ledgerReference || transactionReference) {
      return {
        ok: false as const,
        error: "帳簿または取引で使用中の弾種は削除できません",
      };
    }

    const result = await tx
      .delete(ammoType)
      .where(and(eq(ammoType.id, id), eq(ammoType.userId, user.id)));
    if (result.count === 0) {
      return { ok: false as const, error: "弾種が見つかりません" };
    }
    return { ok: true as const };
  });
}
