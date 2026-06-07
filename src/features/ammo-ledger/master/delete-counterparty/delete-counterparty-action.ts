"use server";

import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { ammoCounterparty } from "@/db/schema/ammo-ledger";
import { resolveAmmoUserForMutation } from "@/features/ammo-ledger/auth/require-ammo-user";

export async function deleteCounterpartyAction({ id }: { id: string }) {
  const userResult = await resolveAmmoUserForMutation();
  if (!userResult.ok) {
    return userResult;
  }
  const user = userResult.user;
  const result = await db
    .delete(ammoCounterparty)
    .where(and(eq(ammoCounterparty.id, id), eq(ammoCounterparty.userId, user.id)));
  if (result.count === 0) {
    return { ok: false as const, error: "購入先が見つかりません" };
  }
  return { ok: true as const };
}
