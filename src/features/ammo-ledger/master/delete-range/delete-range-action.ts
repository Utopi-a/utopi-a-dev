"use server";

import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { ammoRange } from "@/db/schema/ammo-ledger";
import { requireAmmoUser } from "@/features/ammo-ledger/auth/require-ammo-user";

export async function deleteRangeAction({ id }: { id: string }) {
  const user = await requireAmmoUser();
  const result = await db
    .delete(ammoRange)
    .where(and(eq(ammoRange.id, id), eq(ammoRange.userId, user.id)));
  if (result.count === 0) {
    return { ok: false as const, error: "射撃場が見つかりません" };
  }
  return { ok: true as const };
}
