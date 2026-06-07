"use server";

import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { ammoRange } from "@/db/schema/ammo-ledger";
import { requireAmmoUser } from "@/features/ammo-ledger/auth/require-ammo-user";
import { rangeSchema } from "@/features/ammo-ledger/schema/range-schema";

export async function updateRangeAction({ id, input }: { id: string; input: unknown }) {
  const user = await requireAmmoUser();
  const parsed = rangeSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false as const, error: "入力内容を確認してください" };
  }
  const result = await db
    .update(ammoRange)
    .set({ ...parsed.data, updatedAt: new Date() })
    .where(and(eq(ammoRange.id, id), eq(ammoRange.userId, user.id)));
  if (result.count === 0) {
    return { ok: false as const, error: "射撃場が見つかりません" };
  }
  return { ok: true as const };
}
