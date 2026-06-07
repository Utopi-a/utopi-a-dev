"use server";

import { and, eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { db } from "@/db";
import {
  ammoCounterparty,
  ammoGun,
  ammoLedgerEntry,
  ammoRange,
  ammoTransaction,
  ammoType,
} from "@/db/schema/ammo-ledger";
import { requireAmmoUser } from "@/features/ammo-ledger/auth/require-ammo-user";
import { resolveCounterparty } from "@/features/ammo-ledger/master/resolve-counterparty/resolve-counterparty";
import { transactionInputSchema } from "@/features/ammo-ledger/schema/transaction-schema";
import { computeRounds } from "@/features/ammo-ledger/transactions/compute-rounds/compute-rounds";
import { normalizeTransaction } from "@/features/ammo-ledger/transactions/normalize-transaction/normalize-transaction";
import { validateLedgerEntry } from "@/features/ammo-ledger/transactions/validate-ledger-entry/validate-ledger-entry";

export async function createTransactionAction(input: unknown) {
  const user = await requireAmmoUser();
  const parsed = transactionInputSchema.safeParse(input);

  if (!parsed.success) {
    return { ok: false as const, error: "入力内容を確認してください" };
  }

  const data = parsed.data;

  if (data.inputKind === "stock_check") {
    return { ok: false as const, error: "棚卸しは残弾確認画面から行ってください" };
  }

  const [ammoTypeRow] = await db
    .select()
    .from(ammoType)
    .where(and(eq(ammoType.id, data.ammoTypeId), eq(ammoType.userId, user.id)));

  if (!ammoTypeRow) {
    return { ok: false as const, error: "弾種が見つかりません" };
  }

  let gunRow: typeof ammoGun.$inferSelect | undefined;
  let rangeRow: typeof ammoRange.$inferSelect | undefined;

  if (data.inputKind === "consume") {
    const [gun] = await db
      .select()
      .from(ammoGun)
      .where(and(eq(ammoGun.id, data.gunId), eq(ammoGun.userId, user.id)));
    const [range] = await db
      .select()
      .from(ammoRange)
      .where(and(eq(ammoRange.id, data.rangeId), eq(ammoRange.userId, user.id)));

    if (!gun) {
      return { ok: false as const, error: "銃が見つかりません" };
    }
    if (!range) {
      return { ok: false as const, error: "射撃場が見つかりません" };
    }
    gunRow = gun;
    rangeRow = range;
  }

  let counterpartyRow: typeof ammoCounterparty.$inferSelect | undefined;
  if ("counterpartyId" in data && data.counterpartyId) {
    const [row] = await db
      .select()
      .from(ammoCounterparty)
      .where(
        and(eq(ammoCounterparty.id, data.counterpartyId), eq(ammoCounterparty.userId, user.id)),
      );
    counterpartyRow = row;
  }

  const counterparty =
    "counterpartyId" in data || "counterpartyName" in data
      ? resolveCounterparty({
          counterpartyId: "counterpartyId" in data ? data.counterpartyId : undefined,
          counterpartyName: "counterpartyName" in data ? data.counterpartyName : undefined,
          counterpartyAddress: "counterpartyAddress" in data ? data.counterpartyAddress : undefined,
          master: counterpartyRow ?? null,
        })
      : null;

  if ((data.inputKind === "acquire" || data.inputKind === "transfer") && !counterparty) {
    return { ok: false as const, error: "相手方を選択するか、氏名と住所を入力してください" };
  }

  const computedRounds = computeRounds({
    outerBoxCount: data.outerBoxCount,
    boxCount: data.boxCount,
    looseRounds: data.looseRounds,
    roundsPerBox: ammoTypeRow.roundsPerBox,
  });

  const normalized = normalizeTransaction({
    inputKind: data.inputKind,
    occurredOn: data.occurredOn,
    ammoTypeId: ammoTypeRow.id,
    ammoTypeName: ammoTypeRow.name,
    outerBoxCount: data.outerBoxCount,
    boxCount: data.boxCount,
    looseRounds: data.looseRounds,
    roundsPerBox: ammoTypeRow.roundsPerBox,
    gunId: gunRow?.id,
    gunName: gunRow?.name,
    gunPermitNumber: gunRow?.permitNumber,
    rangeId: rangeRow?.id,
    rangeName: rangeRow?.name,
    rangeAddress: rangeRow?.address,
    counterpartyName: counterparty?.name,
    counterpartyAddress: counterparty?.address,
  });

  if (!normalized) {
    return { ok: false as const, error: "数量が0以下です" };
  }

  const validation = validateLedgerEntry(normalized);
  if (!validation.valid) {
    return {
      ok: false as const,
      error: `帳簿に出力できません: ${validation.missingFields.join("、")}`,
    };
  }

  const transactionId = crypto.randomUUID();
  const ledgerEntryId = crypto.randomUUID();

  await db.transaction(async (tx) => {
    await tx.insert(ammoTransaction).values({
      id: transactionId,
      userId: user.id,
      status: "confirmed",
      inputKind: data.inputKind,
      occurredOn: data.occurredOn,
      ammoTypeId: ammoTypeRow.id,
      gunId: gunRow?.id ?? null,
      rangeId: rangeRow?.id ?? null,
      counterpartyId: counterparty?.counterpartyId ?? null,
      outerBoxCount: data.outerBoxCount,
      boxCount: data.boxCount,
      looseRounds: data.looseRounds,
      computedRounds,
      counterpartyName: counterparty?.name ?? null,
      counterpartyAddress: counterparty?.address ?? null,
      memo: data.memo ?? null,
    });

    await tx.insert(ammoLedgerEntry).values({
      id: ledgerEntryId,
      userId: user.id,
      transactionId,
      category: normalized.category,
      occurredOn: normalized.occurredOn,
      ammoTypeId: normalized.ammoTypeId,
      ammoTypeName: normalized.ammoTypeName,
      quantity: normalized.quantity,
      location: normalized.location,
      counterpartyName: normalized.counterpartyName,
      counterpartyAddress: normalized.counterpartyAddress,
      gunId: normalized.gunId,
      gunName: normalized.gunName,
      gunPermitNumber: normalized.gunPermitNumber,
    });
  });

  redirect("/lab/ammo-ledger/ledger");
}
