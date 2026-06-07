"use server";

import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { ammoType } from "@/db/schema/ammo-ledger";
import { resolveAmmoUserForMutation } from "@/features/ammo-ledger/auth/require-ammo-user";
import { ammoTypeSchema } from "@/features/ammo-ledger/schema/ammo-type-schema";
import { buildAmmoTypeLabel } from "@/features/ammo-ledger/schema/build-ammo-type-label";

export async function updateAmmoTypeAction({ id, input }: { id: string; input: unknown }) {
  const userResult = await resolveAmmoUserForMutation();
  if (!userResult.ok) {
    return userResult;
  }
  const user = userResult.user;
  const parsed = ammoTypeSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false as const, error: "入力内容を確認してください" };
  }
  const { name, ...rest } = parsed.data;
  const resolvedName = buildAmmoTypeLabel({
    name,
    caliber: rest.caliber,
    shotType: rest.shotType,
    gaugeNumber: rest.gaugeNumber,
  });
  const result = await db
    .update(ammoType)
    .set({ name: resolvedName, ...rest, updatedAt: new Date() })
    .where(and(eq(ammoType.id, id), eq(ammoType.userId, user.id)));
  if (result.count === 0) {
    return { ok: false as const, error: "弾種が見つかりません" };
  }
  return { ok: true as const };
}
