"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { ammoLedgerEntry, ammoType } from "@/db/schema/ammo-ledger";
import { resolveAmmoUserForMutation } from "@/features/ammo-ledger/auth/require-ammo-user";
import { acquireLedgerAdvisoryLock } from "@/features/ammo-ledger/ledger/lock/acquire-ledger-advisory-lock/acquire-ledger-advisory-lock";
import { assertDatesNotLocked } from "@/features/ammo-ledger/ledger/lock/assert-dates-not-locked/assert-dates-not-locked";
import { buildAmmoTypeLabel } from "@/features/ammo-ledger/schema/build-ammo-type-label";
import type { CartridgeType } from "@/features/ammo-ledger/schema/cartridge-type";
import { confirmClassificationSchema } from "./classification-review-schema";

export async function confirmClassificationAction(input: unknown) {
  const userResult = await resolveAmmoUserForMutation();
  if (!userResult.ok) {
    return userResult;
  }
  const user = userResult.user;

  const parsed = confirmClassificationSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false as const, error: "入力内容を確認してください" };
  }

  const { ammoTypeId, cartridgeType, caliber, gaugeNumber } = parsed.data;

  const now = new Date();

  const transactionResult = await db.transaction(async (tx) => {
    await acquireLedgerAdvisoryLock({ tx, userId: user.id });

    const [existing] = await tx
      .select({ id: ammoType.id, name: ammoType.name })
      .from(ammoType)
      .where(and(eq(ammoType.id, ammoTypeId), eq(ammoType.userId, user.id)));

    if (!existing) {
      return { ok: false as const, error: "弾種が見つかりません" };
    }

    const affectedEntries = await tx
      .select({ occurredOn: ammoLedgerEntry.occurredOn })
      .from(ammoLedgerEntry)
      .where(and(eq(ammoLedgerEntry.ammoTypeId, ammoTypeId), eq(ammoLedgerEntry.userId, user.id)));

    const lockCheck = await assertDatesNotLocked({
      userId: user.id,
      dates: affectedEntries.map((entry) => entry.occurredOn),
      executor: tx,
    });
    if (!lockCheck.ok) {
      return lockCheck;
    }

    const resolvedName = buildAmmoTypeLabel({
      name: existing.name,
      caliber,
      cartridgeType: cartridgeType as CartridgeType,
      gaugeNumber: cartridgeType === "shotgun_shot" ? gaugeNumber : undefined,
    });

    await tx
      .update(ammoType)
      .set({
        caliber,
        cartridgeType,
        gaugeNumber: cartridgeType === "shotgun_shot" ? (gaugeNumber ?? null) : null,
        name: resolvedName,
        classificationConfirmedAt: now,
        updatedAt: now,
      })
      .where(and(eq(ammoType.id, ammoTypeId), eq(ammoType.userId, user.id)));

    await tx
      .update(ammoLedgerEntry)
      .set({
        ammoTypeName: resolvedName,
        ammoCartridgeType: cartridgeType,
        ammoCaliber: caliber,
        ammoGaugeNumber: cartridgeType === "shotgun_shot" ? (gaugeNumber ?? null) : null,
        updatedAt: now,
      })
      .where(and(eq(ammoLedgerEntry.ammoTypeId, ammoTypeId), eq(ammoLedgerEntry.userId, user.id)));

    return { ok: true as const };
  });

  if (!transactionResult.ok) {
    return transactionResult;
  }

  revalidatePath("/lab/ammo-ledger/settings/ammo-types/review");
  revalidatePath("/lab/ammo-ledger/settings/ammo-types");

  return { ok: true as const };
}
