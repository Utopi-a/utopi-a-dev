"use server";

import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { ammoRange } from "@/db/schema/ammo-ledger";
import { resolveAmmoUserForMutation } from "@/features/ammo-ledger/auth/require-ammo-user";

export async function removeRangeFromMyList({ catalogId }: { catalogId: string }) {
  const userResult = await resolveAmmoUserForMutation();
  if (!userResult.ok) {
    return userResult;
  }
  const user = userResult.user;

  const result = await db
    .delete(ammoRange)
    .where(and(eq(ammoRange.userId, user.id), eq(ammoRange.catalogId, catalogId)));

  if (result.count === 0) {
    return { ok: false as const, error: "マイリストに登録されていません" };
  }

  return { ok: true as const };
}
