"use server";

import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { ammoCounterparty } from "@/db/schema/ammo-ledger";
import { resolveAmmoUserForMutation } from "@/features/ammo-ledger/auth/require-ammo-user";

export async function removeCounterpartyFromMyList({ catalogId }: { catalogId: string }) {
  const userResult = await resolveAmmoUserForMutation();
  if (!userResult.ok) {
    return userResult;
  }
  const user = userResult.user;

  const result = await db
    .delete(ammoCounterparty)
    .where(and(eq(ammoCounterparty.userId, user.id), eq(ammoCounterparty.catalogId, catalogId)));

  if (result.count === 0) {
    return { ok: false as const, error: "マイリストに登録されていません" };
  }

  return { ok: true as const };
}
