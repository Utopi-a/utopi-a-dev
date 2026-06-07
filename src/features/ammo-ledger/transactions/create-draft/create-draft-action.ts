"use server";

import { and, eq, isNull } from "drizzle-orm";
import { db } from "@/db";
import { ammoLedgerEntry, ammoTransaction, ammoType } from "@/db/schema/ammo-ledger";
import { requireAmmoUser } from "@/features/ammo-ledger/auth/require-ammo-user";
import { validateDraftFromDiff } from "@/features/ammo-ledger/inventory/validate-draft-from-diff/validate-draft-from-diff";
import { computeStockByAmmoType } from "@/features/ammo-ledger/ledger/compute-stock/compute-stock";
import type { InputKind } from "@/features/ammo-ledger/schema/input-kind";

export async function createDraftFromDiffAction({
  ammoTypeId,
  actualRounds,
  inputKind,
  quantity,
  boxCount,
}: {
  ammoTypeId: string;
  actualRounds: number;
  inputKind: InputKind;
  quantity: number;
  boxCount?: number;
}) {
  const user = await requireAmmoUser();

  const [ammoTypeRow] = await db
    .select()
    .from(ammoType)
    .where(and(eq(ammoType.id, ammoTypeId), eq(ammoType.userId, user.id)));

  if (!ammoTypeRow) {
    return { ok: false as const, error: "弾種が見つかりません" };
  }

  const entries = await db
    .select({
      ammoTypeId: ammoLedgerEntry.ammoTypeId,
      category: ammoLedgerEntry.category,
      quantity: ammoLedgerEntry.quantity,
    })
    .from(ammoLedgerEntry)
    .where(and(eq(ammoLedgerEntry.userId, user.id), isNull(ammoLedgerEntry.voidedAt)));

  const stockMap = computeStockByAmmoType({
    entries: entries
      .filter((e) => e.ammoTypeId !== null)
      .map((e) => ({
        ammoTypeId: e.ammoTypeId as string,
        category: e.category as "acquire" | "consume" | "transfer" | "dispose" | "manufacture",
        quantity: e.quantity,
      })),
  });

  const bookStock = stockMap.get(ammoTypeId) ?? 0;

  const draftValidation = validateDraftFromDiff({
    bookStock,
    actualStock: actualRounds,
    inputKind,
    quantity,
  });

  if (!draftValidation.valid) {
    return { ok: false as const, error: draftValidation.error };
  }

  const diff = actualRounds - bookStock;

  const transactionId = crypto.randomUUID();
  const today = new Date().toISOString().slice(0, 10);

  await db.insert(ammoTransaction).values({
    id: transactionId,
    userId: user.id,
    status: "draft",
    inputKind,
    occurredOn: today,
    ammoTypeId,
    boxCount: boxCount ?? 0,
    looseRounds: boxCount ? 0 : quantity,
    computedRounds: quantity,
    memo: `棚卸し差分 ${diff > 0 ? "+" : ""}${diff}発 からの下書き`,
  });

  return {
    ok: true as const,
    transactionId,
    redirectPath: getDraftRedirectPath({ inputKind, transactionId }),
  };
}

function getDraftRedirectPath({
  inputKind,
  transactionId,
}: {
  inputKind: InputKind;
  transactionId: string;
}): string {
  switch (inputKind) {
    case "consume":
      return `/lab/ammo-ledger/consume/new?draft=${transactionId}`;
    case "acquire":
      return `/lab/ammo-ledger/inflow/new?tab=acquire&draft=${transactionId}`;
    case "dispose":
      return `/lab/ammo-ledger/inflow/new?tab=dispose&draft=${transactionId}`;
    case "transfer":
      return `/lab/ammo-ledger/inflow/new?tab=transfer&draft=${transactionId}`;
    case "stock_check":
      return `/lab/ammo-ledger/inventory`;
  }
}
