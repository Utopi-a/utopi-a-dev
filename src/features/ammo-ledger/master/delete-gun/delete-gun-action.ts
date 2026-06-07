"use server";

import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { ammoGun } from "@/db/schema/ammo-ledger";
import { requireAmmoUser } from "@/features/ammo-ledger/auth/require-ammo-user";

export async function deleteGunAction({ id }: { id: string }) {
  const user = await requireAmmoUser();
  const result = await db
    .delete(ammoGun)
    .where(and(eq(ammoGun.id, id), eq(ammoGun.userId, user.id)));
  if (result.count === 0) {
    return { ok: false as const, error: "銃が見つかりません" };
  }
  return { ok: true as const };
}
