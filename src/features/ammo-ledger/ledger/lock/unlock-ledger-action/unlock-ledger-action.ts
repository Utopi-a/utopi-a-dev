"use server";

import { z } from "zod";
import { db } from "@/db";
import { ammoLedgerLockEvent } from "@/db/schema/ammo-ledger";
import { resolveAmmoUserForMutation } from "@/features/ammo-ledger/auth/require-ammo-user";
import { acquireLedgerAdvisoryLock } from "@/features/ammo-ledger/ledger/lock/acquire-ledger-advisory-lock/acquire-ledger-advisory-lock";
import { getLatestLockState } from "@/features/ammo-ledger/ledger/lock/get-latest-lock-state/get-latest-lock-state";

const unlockLedgerInputSchema = z.object({
  lockedThrough: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "日付の形式が正しくありません"),
  confirmationText: z.literal("帳簿のロックを解除する"),
  reason: z
    .string()
    .min(10, "理由は10文字以上で入力してください")
    .max(500, "理由は500文字以内で入力してください"),
});

export async function unlockLedgerAction(input: unknown) {
  const userResult = await resolveAmmoUserForMutation();
  if (!userResult.ok) {
    return userResult;
  }
  const user = userResult.user;

  const parsed = unlockLedgerInputSchema.safeParse(input);
  if (!parsed.success) {
    const firstError = parsed.error.issues[0];
    if (firstError?.path[0] === "confirmationText") {
      return { ok: false as const, error: "確認文が一致しません" };
    }
    if (firstError?.path[0] === "reason") {
      return { ok: false as const, error: firstError.message };
    }
    return { ok: false as const, error: "入力内容を確認してください" };
  }

  const { lockedThrough, reason } = parsed.data;

  return db.transaction(async (tx) => {
    await acquireLedgerAdvisoryLock({ tx, userId: user.id });

    const currentState = await getLatestLockState({
      userId: user.id,
      executor: tx,
    });

    if (!currentState.isLocked || currentState.lockedThrough === null) {
      return { ok: false as const, error: "帳簿はロックされていません" };
    }

    if (lockedThrough !== currentState.lockedThrough) {
      return {
        ok: false as const,
        error: "ロック対象日が現在のロック日と一致しません",
      };
    }

    await tx.insert(ammoLedgerLockEvent).values({
      id: crypto.randomUUID(),
      userId: user.id,
      eventKind: "unlock",
      lockedThrough,
      reason,
    });

    return { ok: true as const };
  });
}
