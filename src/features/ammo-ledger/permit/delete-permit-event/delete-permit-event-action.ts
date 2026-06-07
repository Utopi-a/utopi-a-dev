"use server";

import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { ammoPermitEvent } from "@/db/schema/ammo-ledger";
import { resolveAmmoUserForMutation } from "@/features/ammo-ledger/auth/require-ammo-user";

export async function deletePermitEventAction({ id }: { id: string }) {
  const userResult = await resolveAmmoUserForMutation();
  if (!userResult.ok) {
    return userResult;
  }
  const user = userResult.user;
  const result = await db
    .delete(ammoPermitEvent)
    .where(and(eq(ammoPermitEvent.id, id), eq(ammoPermitEvent.userId, user.id)));

  if (result.count === 0) {
    return { ok: false as const, error: "イベントが見つかりません" };
  }

  return { ok: true as const };
}
