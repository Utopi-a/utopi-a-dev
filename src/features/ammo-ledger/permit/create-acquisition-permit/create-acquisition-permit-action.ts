"use server";

import { db } from "@/db";
import { resolveAmmoUserForMutation } from "@/features/ammo-ledger/auth/require-ammo-user";
import { insertAcquisitionPermit } from "@/features/ammo-ledger/permit/insert-acquisition-permit/insert-acquisition-permit";
import { acquisitionPermitInputSchema } from "@/features/ammo-ledger/schema/acquisition-permit-schema";

export async function createAcquisitionPermitAction(input: unknown) {
  const userResult = await resolveAmmoUserForMutation();
  if (!userResult.ok) {
    return userResult;
  }
  const user = userResult.user;
  const parsed = acquisitionPermitInputSchema.safeParse(input);

  if (!parsed.success) {
    return { ok: false as const, error: "入力内容を確認してください" };
  }

  await db.transaction(async (tx) => {
    await insertAcquisitionPermit({
      tx,
      userId: user.id,
      permit: { kind: "permit", ...parsed.data },
    });
  });

  return { ok: true as const };
}
