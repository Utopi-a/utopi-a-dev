"use server";

import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { ammoGun } from "@/db/schema/ammo-ledger";
import { requireAmmoUser } from "@/features/ammo-ledger/auth/require-ammo-user";
import { gunSchema } from "@/features/ammo-ledger/schema/gun-schema";

export async function updateGunAction({ id, input }: { id: string; input: unknown }) {
  const user = await requireAmmoUser();
  const parsed = gunSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false as const, error: "入力内容を確認してください" };
  }
  const result = await db
    .update(ammoGun)
    .set({ ...parsed.data, updatedAt: new Date() })
    .where(and(eq(ammoGun.id, id), eq(ammoGun.userId, user.id)));
  if (result.count === 0) {
    return { ok: false as const, error: "銃が見つかりません" };
  }
  return { ok: true as const };
}
