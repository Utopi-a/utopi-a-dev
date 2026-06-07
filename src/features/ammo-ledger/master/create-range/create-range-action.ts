"use server";

import { db } from "@/db";
import { ammoRange } from "@/db/schema/ammo-ledger";
import { requireAmmoUser } from "@/features/ammo-ledger/auth/require-ammo-user";
import { rangeSchema } from "@/features/ammo-ledger/schema/range-schema";

export async function createRangeAction(input: unknown) {
  const user = await requireAmmoUser();
  const parsed = rangeSchema.safeParse(input);

  if (!parsed.success) {
    return { ok: false as const, error: "入力内容を確認してください" };
  }

  const id = crypto.randomUUID();
  await db.insert(ammoRange).values({
    id,
    userId: user.id,
    ...parsed.data,
  });

  return { ok: true as const, id };
}
