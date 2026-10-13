"use server";

import { and, count, eq, isNull, lte } from "drizzle-orm";
import { refresh } from "next/cache";
import { z } from "zod";
import { db } from "@/db";
import { ammoLedgerEntry, ammoLedgerLockEvent, ammoType } from "@/db/schema/ammo-ledger";
import { resolveAmmoUserForMutation } from "@/features/ammo-ledger/auth/require-ammo-user";
import {
  type LedgerLockIssue,
  validateLedgerForLock,
} from "@/features/ammo-ledger/documents/validate-ledger-for-lock/validate-ledger-for-lock";
import { acquireLedgerAdvisoryLock } from "@/features/ammo-ledger/ledger/lock/acquire-ledger-advisory-lock/acquire-ledger-advisory-lock";
import { getLatestLockState } from "@/features/ammo-ledger/ledger/lock/get-latest-lock-state/get-latest-lock-state";
import type { LedgerLockState } from "@/features/ammo-ledger/ledger/lock/lock-state-types";
import { getTokyoIsoDate } from "@/lib/date/get-tokyo-iso-date";

const lockLedgerInputSchema = z.object({
  lockedThrough: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "日付の形式が正しくありません"),
});

type LockLedgerResult =
  | { ok: true; lockState: LedgerLockState }
  | { ok: false; error: string; issues?: LedgerLockIssue[] };

export async function lockLedgerAction(input: unknown): Promise<LockLedgerResult> {
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

  const result = await db.transaction(async (tx) => {
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

    const [unconfirmedAmmoTypes] = await tx
      .select({ count: count() })
      .from(ammoType)
      .where(and(eq(ammoType.userId, user.id), isNull(ammoType.classificationConfirmedAt)));

    const year = lockedThrough.slice(0, 4);
    const from = `${year}-01-01`;
    // 前年以前の記録は、年初繰越の未登録を前年末の帳簿残数から見つけるために読む。
    const entries = await tx
      .select()
      .from(ammoLedgerEntry)
      .where(
        and(
          eq(ammoLedgerEntry.userId, user.id),
          isNull(ammoLedgerEntry.voidedAt),
          lte(ammoLedgerEntry.occurredOn, lockedThrough),
        ),
      );

    const issues = validateLedgerForLock({
      entries,
      from,
      to: lockedThrough,
      unconfirmedAmmoTypeCount: unconfirmedAmmoTypes?.count ?? 0,
    });
    if (issues.length > 0) {
      return {
        ok: false as const,
        error: `帳簿に${issues.length}件の問題があるため確定できません`,
        issues,
      };
    }

    await tx.insert(ammoLedgerLockEvent).values({
      id: crypto.randomUUID(),
      userId: user.id,
      eventKind: "lock",
      lockedThrough,
    });

    return { ok: true as const, lockState: { isLocked: true, lockedThrough } };
  });

  if (result.ok) {
    refresh();
  }
  return result;
}
