"use server";

import { db } from "@/db";
import { ammoGun } from "@/db/schema/ammo-ledger";
import { resolveAmmoUserForMutation } from "@/features/ammo-ledger/auth/require-ammo-user";
import { gunSchema } from "@/features/ammo-ledger/schema/gun-schema";

export async function createGunAction(input: unknown) {
  const userResult = await resolveAmmoUserForMutation();
  if (!userResult.ok) {
    return userResult;
  }
  const user = userResult.user;
  const parsed = gunSchema.safeParse(input);

  if (!parsed.success) {
    return { ok: false as const, error: "入力内容を確認してください" };
  }

  const id = crypto.randomUUID();
  await db.insert(ammoGun).values({
    id,
    userId: user.id,
    ...parsed.data,
  });

  return { ok: true as const, id };
}
