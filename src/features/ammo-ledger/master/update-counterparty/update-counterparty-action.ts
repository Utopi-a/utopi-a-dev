"use server";

import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { ammoCounterparty } from "@/db/schema/ammo-ledger";
import { requireAmmoUser } from "@/features/ammo-ledger/auth/require-ammo-user";
import { counterpartySchema } from "@/features/ammo-ledger/schema/counterparty-schema";

export async function updateCounterpartyAction({ id, input }: { id: string; input: unknown }) {
  const user = await requireAmmoUser();
  const parsed = counterpartySchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false as const, error: "入力内容を確認してください" };
  }
  const result = await db
    .update(ammoCounterparty)
    .set({ ...parsed.data, updatedAt: new Date() })
    .where(and(eq(ammoCounterparty.id, id), eq(ammoCounterparty.userId, user.id)));
  if (result.count === 0) {
    return { ok: false as const, error: "購入先が見つかりません" };
  }
  return { ok: true as const };
}
