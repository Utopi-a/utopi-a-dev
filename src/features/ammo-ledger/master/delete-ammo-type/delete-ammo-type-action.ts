"use server";

import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { ammoType } from "@/db/schema/ammo-ledger";
import { requireAmmoUser } from "@/features/ammo-ledger/auth/require-ammo-user";

export async function deleteAmmoTypeAction({ id }: { id: string }) {
  const user = await requireAmmoUser();
  const result = await db
    .delete(ammoType)
    .where(and(eq(ammoType.id, id), eq(ammoType.userId, user.id)));
  if (result.count === 0) {
    return { ok: false as const, error: "弾種が見つかりません" };
  }
  return { ok: true as const };
}
