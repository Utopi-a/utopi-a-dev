"use server";

import { and, eq, isNull } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { ammoLedgerEntry } from "@/db/schema/ammo-ledger";
import { resolveAmmoUserForMutation } from "@/features/ammo-ledger/auth/require-ammo-user";
import { acquireLedgerAdvisoryLock } from "@/features/ammo-ledger/ledger/lock/acquire-ledger-advisory-lock/acquire-ledger-advisory-lock";
import { assertDatesNotLocked } from "@/features/ammo-ledger/ledger/lock/assert-dates-not-locked/assert-dates-not-locked";
import { correctOrphanEntrySchema } from "./classification-review-schema";

export async function correctOrphanEntryAction(input: unknown) {
  const userResult = await resolveAmmoUserForMutation();
  if (!userResult.ok) {
    return userResult;
  }
  const user = userResult.user;

  const parsed = correctOrphanEntrySchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false as const, error: "入力内容を確認してください" };
  }

  const { ledgerEntryId, cartridgeType, caliber, gaugeNumber } = parsed.data;

  const transactionResult = await db.transaction(async (tx) => {
    await acquireLedgerAdvisoryLock({ tx, userId: user.id });

    const [entry] = await tx
      .select({ occurredOn: ammoLedgerEntry.occurredOn })
      .from(ammoLedgerEntry)
      .where(
        and(
          eq(ammoLedgerEntry.id, ledgerEntryId),
          eq(ammoLedgerEntry.userId, user.id),
          isNull(ammoLedgerEntry.ammoTypeId),
          isNull(ammoLedgerEntry.voidedAt),
        ),
      );

    if (!entry) {
      return { ok: false as const, error: "記録が見つかりません" };
    }

    const lockCheck = await assertDatesNotLocked({
      userId: user.id,
      dates: [entry.occurredOn],
      executor: tx,
    });
    if (!lockCheck.ok) {
      return lockCheck;
    }

    const result = await tx
      .update(ammoLedgerEntry)
      .set({
        ammoCartridgeType: cartridgeType,
        ammoCaliber: caliber,
        ammoGaugeNumber: cartridgeType === "shotgun_shot" ? (gaugeNumber ?? null) : null,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(ammoLedgerEntry.id, ledgerEntryId),
          eq(ammoLedgerEntry.userId, user.id),
          isNull(ammoLedgerEntry.ammoTypeId),
          isNull(ammoLedgerEntry.voidedAt),
        ),
      );

    if (result.count === 0) {
      return { ok: false as const, error: "記録が見つかりません" };
    }

    return { ok: true as const };
  });

  if (!transactionResult.ok) {
    return transactionResult;
  }

  revalidatePath("/lab/ammo-ledger/settings/ammo-types/review");

  return { ok: true as const };
}
