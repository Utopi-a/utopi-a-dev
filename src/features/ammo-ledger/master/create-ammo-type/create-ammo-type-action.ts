"use server";

import { db } from "@/db";
import { ammoType } from "@/db/schema/ammo-ledger";
import { requireAmmoUser } from "@/features/ammo-ledger/auth/require-ammo-user";
import { ammoTypeSchema } from "@/features/ammo-ledger/schema/ammo-type-schema";
import { buildAmmoTypeLabel } from "@/features/ammo-ledger/schema/build-ammo-type-label";

export async function createAmmoTypeAction(input: unknown) {
  const user = await requireAmmoUser();
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

  const id = crypto.randomUUID();
  await db.insert(ammoType).values({
    id,
    userId: user.id,
    name: resolvedName,
    ...rest,
  });

  return { ok: true as const, id };
}
