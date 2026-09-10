"use server";

import { db } from "@/db";
import { ammoLedgerProfile } from "@/db/schema/ammo-ledger";
import { resolveAmmoUserForMutation } from "@/features/ammo-ledger/auth/require-ammo-user";
import { ledgerProfileSchema } from "@/features/ammo-ledger/schema/ledger-profile-schema";

export async function upsertLedgerProfileAction(input: unknown) {
  const userResult = await resolveAmmoUserForMutation();
  if (!userResult.ok) {
    return userResult;
  }
  const user = userResult.user;
  const parsed = ledgerProfileSchema.safeParse(input);

  if (!parsed.success) {
    return { ok: false as const, error: "入力内容を確認してください" };
  }

  const profileValues = {
    ownerName: parsed.data.ownerName,
    ownerFurigana: parsed.data.ownerFurigana || null,
    possessionPermitCertificateNumber: parsed.data.possessionPermitCertificateNumber || null,
    ownerAddress: parsed.data.ownerAddress ?? null,
    ownerBirthDate: parsed.data.ownerBirthDate ?? null,
    ownerPhone: parsed.data.ownerPhone ?? null,
    updatedAt: new Date(),
  };

  await db
    .insert(ammoLedgerProfile)
    .values({
      userId: user.id,
      ...profileValues,
    })
    .onConflictDoUpdate({
      target: ammoLedgerProfile.userId,
      set: profileValues,
    });

  return { ok: true as const };
}
