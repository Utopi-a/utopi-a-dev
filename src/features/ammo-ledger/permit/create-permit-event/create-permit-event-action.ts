"use server";

import { db } from "@/db";
import { ammoPermitEvent } from "@/db/schema/ammo-ledger";
import { requireAmmoUser } from "@/features/ammo-ledger/auth/require-ammo-user";
import { permitEventInputSchema } from "@/features/ammo-ledger/schema/permit-event-schema";

export async function createPermitEventAction(input: unknown) {
  const user = await requireAmmoUser();
  const parsed = permitEventInputSchema.safeParse(input);

  if (!parsed.success) {
    return { ok: false as const, error: "入力内容を確認してください" };
  }

  await db.insert(ammoPermitEvent).values({
    id: crypto.randomUUID(),
    userId: user.id,
    ...parsed.data,
  });

  return { ok: true as const };
}
