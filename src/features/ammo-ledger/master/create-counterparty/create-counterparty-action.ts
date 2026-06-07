"use server";

import { db } from "@/db";
import { ammoCounterparty } from "@/db/schema/ammo-ledger";
import { requireAmmoUser } from "@/features/ammo-ledger/auth/require-ammo-user";
import { counterpartySchema } from "@/features/ammo-ledger/schema/counterparty-schema";

export async function createCounterpartyAction(input: unknown) {
  const user = await requireAmmoUser();
  const parsed = counterpartySchema.safeParse(input);

  if (!parsed.success) {
    return { ok: false as const, error: "入力内容を確認してください" };
  }

  const id = crypto.randomUUID();
  await db.insert(ammoCounterparty).values({
    id,
    userId: user.id,
    ...parsed.data,
  });

  return { ok: true as const, id };
}
