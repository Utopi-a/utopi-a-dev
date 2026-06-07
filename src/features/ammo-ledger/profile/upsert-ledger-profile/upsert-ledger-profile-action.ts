"use server";

import { db } from "@/db";
import { ammoLedgerProfile } from "@/db/schema/ammo-ledger";
import { requireAmmoUser } from "@/features/ammo-ledger/auth/require-ammo-user";
import { ledgerProfileSchema } from "@/features/ammo-ledger/schema/ledger-profile-schema";

export async function upsertLedgerProfileAction(input: unknown) {
  const user = await requireAmmoUser();
  const parsed = ledgerProfileSchema.safeParse(input);

  if (!parsed.success) {
    return { ok: false as const, error: "入力内容を確認してください" };
  }

  await db
    .insert(ammoLedgerProfile)
    .values({
      userId: user.id,
      ownerName: parsed.data.ownerName,
      ownerAddress: parsed.data.ownerAddress ?? null,
      updatedAt: new Date(),
    })
    .onConflictDoUpdate({
      target: ammoLedgerProfile.userId,
      set: {
        ownerName: parsed.data.ownerName,
        ownerAddress: parsed.data.ownerAddress ?? null,
        updatedAt: new Date(),
      },
    });

  return { ok: true as const };
}
