"use server";

import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { ammoAcquisitionPermit } from "@/db/schema/ammo-ledger";
import { resolveAmmoUserForMutation } from "@/features/ammo-ledger/auth/require-ammo-user";

export async function deleteAcquisitionPermitAction({ id }: { id: string }) {
  const userResult = await resolveAmmoUserForMutation();
  if (!userResult.ok) {
    return userResult;
  }
  const user = userResult.user;

  const result = await db
    .delete(ammoAcquisitionPermit)
    .where(and(eq(ammoAcquisitionPermit.id, id), eq(ammoAcquisitionPermit.userId, user.id)));

  if (result.count === 0) {
    return { ok: false as const, error: "許可が見つかりません" };
  }

  return { ok: true as const };
}
