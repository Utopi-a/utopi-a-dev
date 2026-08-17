"use server";

import { and, eq, gte, isNull, lte } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { ammoLedgerEntry, ammoLedgerLockEvent } from "@/db/schema/ammo-ledger";
import { resolveAmmoUserForMutation } from "@/features/ammo-ledger/auth/require-ammo-user";
import { validateLedgerForLock } from "@/features/ammo-ledger/documents/validate-ledger-for-lock/validate-ledger-for-lock";
import { acquireLedgerAdvisoryLock } from "@/features/ammo-ledger/ledger/lock/acquire-ledger-advisory-lock/acquire-ledger-advisory-lock";
import { getLatestLockState } from "@/features/ammo-ledger/ledger/lock/get-latest-lock-state/get-latest-lock-state";
import { getTokyoIsoDate } from "@/lib/date/get-tokyo-iso-date";

const lockLedgerInputSchema = z.object({
  lockedThrough: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "日付の形式が正しくありません"),
});

export async function lockLedgerAction(input: unknown) {
  const userResult = await resolveAmmoUserForMutation();
  if (!userResult.ok) {
    return userResult;
  }
  const user = userResult.user;

  const parsed = lockLedgerInputSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false as const, error: "入力内容を確認してください" };
  }

  const { lockedThrough } = parsed.data;

  const today = getTokyoIsoDate();
  if (lockedThrough > today) {
    return { ok: false as const, error: "今日より未来の日付にはロックできません" };
  }

  return db.transaction(async (tx) => {
    await acquireLedgerAdvisoryLock({ tx, userId: user.id });

    const currentState = await getLatestLockState({
      userId: user.id,
      executor: tx,
    });

    if (currentState.isLocked && currentState.lockedThrough !== null) {
      if (lockedThrough <= currentState.lockedThrough) {
        return {
          ok: false as const,
          error: "現在のロック日より後の日付を指定してください",
        };
      }
    }

    const year = lockedThrough.slice(0, 4);
    const from = `${year}-01-01`;
    const entries = await tx
      .select()
      .from(ammoLedgerEntry)
      .where(
        and(
          eq(ammoLedgerEntry.userId, user.id),
          isNull(ammoLedgerEntry.voidedAt),
          gte(ammoLedgerEntry.occurredOn, from),
          lte(ammoLedgerEntry.occurredOn, lockedThrough),
        ),
      );

    const issues = validateLedgerForLock({ entries, from, to: lockedThrough });
    if (issues.length > 0) {
      return {
        ok: false as const,
        error: `帳簿に問題があります: ${issues[0].message}（${issues.length}件）`,
      };
    }

    await tx.insert(ammoLedgerLockEvent).values({
      id: crypto.randomUUID(),
      userId: user.id,
      eventKind: "lock",
      lockedThrough,
    });

    return { ok: true as const };
  });
}
